import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { AppProvider } from './src/store/AppContext';
import AppNavigator from './src/navigation/AppNavigator';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  useEffect(() => {
    // Hide the native splash on first paint — the in-app loading screen
    // in AppNavigator shows while Firebase auth state resolves.
    // No artificial delay: any delay here directly blocks the user from
    // seeing the sign-in screen.
    SplashScreen.hideAsync().catch(() => {});

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const { type } = response.notification.request.content.data || {};
      console.log('Notification tapped:', type);
    });

    return () => subscription.remove();
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
