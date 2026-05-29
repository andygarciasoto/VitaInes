import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import { AppProvider } from './src/store/AppContext';
import AppNavigator from './src/navigation/AppNavigator';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  useEffect(() => {
    // Don't hide splash until fonts are ready
    if (!fontsLoaded) return;

    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 1200);

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const { type } = response.notification.request.content.data || {};
      console.log('Notification tapped:', type);
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [fontsLoaded]);

  // Keep splash screen visible while fonts load
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppNavigator />
        <StatusBar style="dark" backgroundColor="transparent" translucent />
      </AppProvider>
    </SafeAreaProvider>
  );
}
