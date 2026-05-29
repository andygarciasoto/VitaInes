import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useApp } from '../store/AppContext';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { t } from '../localization';

import SignInScreen from '../screens/auth/SignInScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import HomeScreen from '../screens/home/HomeScreen';
import HistoryScreen from '../screens/history/HistoryScreen';
import MedicationsScreen from '../screens/medications/MedicationsScreen';
import InsightsScreen from '../screens/insights/InsightsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import AddReadingScreen from '../screens/readings/AddReadingScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: '🏠', History: '📈', Medications: '💊', Insights: '✨', Profile: '👤',
};

// Outside component — stable reference, no remount issues
const TabIcon = ({ name, focused }) => (
  <View style={[styles.tabIconContainer, focused && styles.tabIconFocused]}>
    <Text style={styles.tabIcon}>{TAB_ICONS[name]}</Text>
  </View>
);

const MainTabs = ({ language }) => (
  // key={language} forces tab labels to re-render when language changes
  <Tab.Navigator
    key={language}
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      tabBarLabel: ({ focused }) => (
        <Text
          style={[styles.tabLabel, focused && styles.tabLabelFocused]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {t(`nav.${route.name.toLowerCase()}`)}
        </Text>
      ),
      tabBarStyle: styles.tabBar,
      tabBarItemStyle: styles.tabItem,
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textLight,
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="History" component={HistoryScreen} />
    <Tab.Screen name="Medications" component={MedicationsScreen} />
    <Tab.Screen name="Insights" component={InsightsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SignIn" component={SignInScreen} />
    <Stack.Screen name="SignUp" component={SignUpScreen} />
  </Stack.Navigator>
);

const AppNavigator = () => {
  const { state } = useApp();
  const { user, userProfile, authLoading, language } = state;

  if (authLoading) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingHeart}>♥</Text>
        <Text style={styles.loadingText}>VitaInes</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : !userProfile?.onboardingComplete ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="Main">
              {() => <MainTabs language={language} />}
            </Stack.Screen>
            <Stack.Screen
              name="AddReading"
              component={AddReadingScreen}
              options={{ presentation: 'modal' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
  },
  loadingHeart: { fontSize: 64, color: COLORS.primary, marginBottom: SPACING.md },
  loadingText: { fontSize: FONTS.xxl, fontWeight: FONTS.bold, color: COLORS.primary },

  tabBar: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    // 84px gives 84 - 10 - 10 = 64px inner: icon(36) + gap(4) + label(14) = 54px → 10px breathing room
    height: 84, paddingBottom: 10, paddingTop: 10,
  },
  tabItem: {
    // No extra paddingTop — avoids the icon being pushed into the label
    paddingTop: 0,
    paddingBottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconContainer: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 3,
  },
  tabIconFocused: { backgroundColor: COLORS.primaryLight },
  tabIcon: { fontSize: 20, lineHeight: 24 },
  tabLabel: {
    fontSize: 10.5, color: COLORS.textLight,
    textAlign: 'center', maxWidth: 72,
  },
  tabLabelFocused: { color: COLORS.primary, fontWeight: FONTS.semiBold },
});

export default AppNavigator;
