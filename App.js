import 'react-native-gesture-handler';
import React, { useEffect, Component } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { AppProvider } from './src/store/AppContext';
import AppNavigator from './src/navigation/AppNavigator';

SplashScreen.preventAutoHideAsync().catch(() => {});

// ─── Error boundary ───────────────────────────────────────────────────────────
// Catches any render crash and shows the error on screen instead of a blank
// white screen. Remove once the iOS crash is diagnosed and fixed.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error?.message, info?.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <View style={eb.container}>
          <Text style={eb.title}>App Error (debug)</Text>
          <ScrollView>
            <Text style={eb.message}>{this.state.error?.message}</Text>
            <Text style={eb.stack}>{this.state.error?.stack}</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}
const eb = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', padding: 24, paddingTop: 60 },
  title: { color: '#FF6B6B', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  message: { color: '#FFD93D', fontSize: 14, marginBottom: 12, lineHeight: 20 },
  stack: { color: '#aaa', fontSize: 11, lineHeight: 16 },
});

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});

    let subscription;
    try {
      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const { type } = response.notification.request.content.data || {};
        console.log('Notification tapped:', type);
      });
    } catch (e) {
      console.warn('[App] Notifications listener failed:', e?.message);
    }

    return () => subscription?.remove();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppProvider>
          <AppNavigator />
          <StatusBar style="dark" backgroundColor="transparent" translucent />
        </AppProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
