import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useApp } from '../store/AppContext';
import { COLORS, FONTS } from '../constants/theme';
import { t } from '../localization';
import ViLogo from '../components/common/ViLogo';

import SignInScreen from '../screens/auth/SignInScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import SignUpSuccessScreen from '../screens/auth/SignUpSuccessScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
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

// Single component owns BOTH icon and label — eliminates the React Navigation
// two-layer positioning that caused icon/label overlap.
const TabItem = React.memo(({ name, label, focused }) => (
  <View style={styles.tabItem}>
    <View style={[styles.tabIconWrap, focused && styles.tabIconWrapFocused]}>
      <Text style={styles.tabIcon}>{TAB_ICONS[name]}</Text>
    </View>
    <Text
      style={[styles.tabLabel, focused && styles.tabLabelFocused]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
    >
      {label}
    </Text>
  </View>
));

const MainTabs = ({ language }) => (
  // key={language} forces a full re-render so t() calls inside update immediately
  <Tab.Navigator
    key={language}
    screenOptions={({ route }) => ({
      headerShown: false,
      // tabBarShowLabel: false — we render the label ourselves inside TabItem
      tabBarShowLabel: false,
      tabBarIcon: ({ focused }) => (
        <TabItem
          name={route.name}
          label={t(`nav.${route.name.toLowerCase()}`)}
          focused={focused}
        />
      ),
      tabBarStyle: styles.tabBar,
      tabBarItemStyle: styles.tabBarItem,
    })}
  >
    <Tab.Screen name="Home"        component={HomeScreen} />
    <Tab.Screen name="History"     component={HistoryScreen} />
    <Tab.Screen name="Medications" component={MedicationsScreen} />
    <Tab.Screen name="Insights"    component={InsightsScreen} />
    <Tab.Screen name="Profile"     component={ProfileScreen} />
  </Tab.Navigator>
);

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SignIn"         component={SignInScreen} />
    <Stack.Screen name="SignUp"         component={SignUpScreen} />
    <Stack.Screen name="SignUpSuccess"  component={SignUpSuccessScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
  </Stack.Navigator>
);

const AppNavigator = () => {
  const { state } = useApp();
  const { user, userProfile, authLoading, language } = state;

  if (authLoading) {
    return (
      <View style={styles.loading}>
        <ViLogo size={100} />
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
    gap: 12,
  },
  loadingText: {
    fontSize: FONTS.xxl,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
    letterSpacing: 0.5,
  },

  // Tab bar container — height only, no padding (all spacing lives inside TabItem)
  tabBar: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: 68,        // React Navigation appends device bottom-inset on top of this
    paddingTop: 0,
    paddingBottom: 0,
  },
  // Each touchable slot must match bar height so TabItem fills it completely
  tabBarItem: {
    height: 68,
    paddingTop: 0,
    paddingBottom: 0,
  },

  // TabItem: the single unit that renders icon circle + label
  tabItem: {
    flex: 1,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,             // explicit gap — icon and label never touch
    paddingTop: 8,
    paddingBottom: 4,
  },
  tabIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapFocused: {
    backgroundColor: COLORS.primaryLight,
  },
  tabIcon: {
    fontSize: 20,
    lineHeight: 22,
    textAlign: 'center',
  },
  tabLabel: {
    fontSize: 10,
    lineHeight: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    // Wide enough that even "Recomendaciones" fits before adjustsFontSizeToFit kicks in
    width: 68,
  },
  tabLabelFocused: {
    color: COLORS.primary,
    fontWeight: FONTS.semiBold,
  },
});

export default AppNavigator;
