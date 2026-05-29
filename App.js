import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import { AppProvider } from './src/store/AppContext';
import AppNavigator from './src/navigation/AppNavigator';

// Load Nunito fonts if the package is installed — fails silently if not
let nunitoFonts = {};
try {
  const n = require('@expo-google-fonts/nunito');
  nunitoFonts = {
    Nunito_400Regular: n.Nunito_400Regular,
    Nunito_500Medium:  n.Nunito_500Medium,
    Nunito_600SemiBold: n.Nunito_600SemiBold,
    Nunito_700Bold:    n.Nunito_700Bold,
  };
} catch (_) {}

SplashScreen.preventAutoHideAsync();

export default function App() {
  // Fonts load in the background — we never block the app on them.
  // React Native falls back to the system font until they arrive.
  useFonts(nunitoFonts);

  useEffect(() => {
    // Hide splash after a short delay regardless of font state
    const timer = setTimeout(() => SplashScreen.hideAsync(), 1200);

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const { type } = response.notification.request.content.data || {};
      console.log('Notification tapped:', type);
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppNavigator />
        <StatusBar style="dark" backgroundColor="transparent" translucent />
      </AppProvider>
    </SafeAreaProvider>
  );
}
