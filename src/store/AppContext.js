import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { subscribeToAuthState } from '../services/firebase/auth';
import { getUserProfile } from '../services/firebase/userProfile';
import { setLocale } from '../localization';

const AppContext = createContext(null);

const initialState = {
  // Auth
  user: null,
  userProfile: null,
  authLoading: true,

  // Language
  language: 'en',

  // Readings
  latestReading: null,
  recentReadings: [],
  readingsLoading: false,

  // Medications
  medications: [],
  medicationsLoading: false,

  // AI recommendations
  recommendations: [],
  recommendationsLoading: false,

  // UI state
  error: null,
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, authLoading: false };
    case 'SET_USER_PROFILE':
      return { ...state, userProfile: action.payload };
    case 'SET_AUTH_LOADING':
      return { ...state, authLoading: action.payload };
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    case 'SET_LATEST_READING':
      return { ...state, latestReading: action.payload };
    case 'SET_RECENT_READINGS':
      return { ...state, recentReadings: action.payload, readingsLoading: false };
    case 'SET_READINGS_LOADING':
      return { ...state, readingsLoading: action.payload };
    case 'ADD_READING':
      return {
        ...state,
        latestReading: action.payload,
        recentReadings: [action.payload, ...state.recentReadings].slice(0, 50),
      };
    case 'SET_MEDICATIONS':
      return { ...state, medications: action.payload, medicationsLoading: false };
    case 'SET_MEDICATIONS_LOADING':
      return { ...state, medicationsLoading: action.payload };
    case 'ADD_MEDICATION':
      return { ...state, medications: [...state.medications, action.payload] };
    case 'UPDATE_MEDICATION':
      return {
        ...state,
        medications: state.medications.map((m) =>
          m.id === action.payload.id ? { ...m, ...action.payload } : m
        ),
      };
    case 'DELETE_MEDICATION':
      return {
        ...state,
        medications: state.medications.filter((m) => m.id !== action.payload),
      };
    case 'SET_RECOMMENDATIONS':
      return { ...state, recommendations: action.payload, recommendationsLoading: false };
    case 'SET_RECOMMENDATIONS_LOADING':
      return { ...state, recommendationsLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SIGN_OUT':
      return { ...initialState, authLoading: false };
    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load saved language preference
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('language');
        if (savedLang) {
          setLocale(savedLang);
          dispatch({ type: 'SET_LANGUAGE', payload: savedLang });
        }
      } catch {}
    };
    loadLanguage();
  }, []);

  // Subscribe to Firebase auth state
  useEffect(() => {
    let failsafe;
    let unsubscribe = () => {};

    // Failsafe fires if Firebase never calls back (bad config / no network).
    // 2 s is enough for a cold start; cached auth state fires nearly instantly.
    failsafe = setTimeout(() => {
      console.warn('[AppContext] auth timeout — unblocking navigation');
      dispatch({ type: 'SET_AUTH_LOADING', payload: false });
    }, 2000);

    try {
      unsubscribe = subscribeToAuthState(async (user) => {
        clearTimeout(failsafe);
        if (user) {
          dispatch({ type: 'SET_USER', payload: user });
          try {
            const profile = await getUserProfile(user.uid);
            if (profile) {
              dispatch({ type: 'SET_USER_PROFILE', payload: profile });
              if (profile.language) {
                setLocale(profile.language);
                dispatch({ type: 'SET_LANGUAGE', payload: profile.language });
              }
            }
          } catch (profileErr) {
            console.warn('[AppContext] failed to load user profile:', profileErr);
          }
        } else {
          dispatch({ type: 'SIGN_OUT' });
        }
      });
    } catch (err) {
      // Firebase failed to initialize (e.g. bad config) — unblock immediately
      console.warn('[AppContext] Firebase auth subscription failed:', err);
      clearTimeout(failsafe);
      dispatch({ type: 'SET_AUTH_LOADING', payload: false });
    }

    return () => {
      clearTimeout(failsafe);
      unsubscribe();
    };
  }, []);

  const setLanguage = async (lang) => {
    setLocale(lang);
    dispatch({ type: 'SET_LANGUAGE', payload: lang });
    await AsyncStorage.setItem('language', lang);
  };

  return (
    <AppContext.Provider value={{ state, dispatch, setLanguage }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
