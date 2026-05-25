import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { Button } from '../components/Button';

// Import Screens
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';

// Stack instances
const Stack = createStackNavigator();

// Temporary Dashboard Placeholder to complete the Authentication flow beautifully
const DashboardPlaceholder = () => {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.dashboardContainer}>
      <View style={styles.dashboardContent}>
        <Text style={[TYPOGRAPHY.caption, styles.tag]}>🌿 MVP CORE ACTIVE</Text>
        <Text style={[TYPOGRAPHY.h1, styles.title]}>Hello, {user?.name || 'Jane'} ✨</Text>
        <Text style={[TYPOGRAPHY.bodyLarge, styles.subtitle]}>
          Welcome to your customized Aarini hormonal wellness space.
        </Text>

        <View style={styles.card}>
          <Text style={[TYPOGRAPHY.h3, styles.cardTitle]}>Cycle Status Calibration</Text>
          <View style={styles.specRow}>
            <Text style={TYPOGRAPHY.bodyMedium}>Age Profile:</Text>
            <Text style={styles.specVal}>{user?.age || '25'} years old</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={TYPOGRAPHY.bodyMedium}>Typical Cycle Length:</Text>
            <Text style={styles.specVal}>{user?.cycleLength || '28'} days</Text>
          </View>
          <Text style={styles.successNote}>
            ✓ Authentication and Session state have successfully synced with Firestore and local caches.
          </Text>
        </View>

        <Button 
          title="Sign Out" 
          variant="outline"
          onPress={logout} 
          style={styles.logoutBtn}
        />
      </View>
    </SafeAreaView>
  );
};

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Splash" component={SplashScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
  </Stack.Navigator>
);

const AppStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Dashboard" component={DashboardPlaceholder} />
  </Stack.Navigator>
);

export const AppNavigator = () => {
  const { userToken, isLoading } = useAuth();

  // Simple clean Loading page while checking storage token restore
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={TYPOGRAPHY.bodyMedium}>Synchronizing wellness state...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {userToken ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  dashboardContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  dashboardContent: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tag: {
    color: COLORS.primaryDark,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    textAlign: 'center',
    color: COLORS.textMedium,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: SPACING.lg,
    width: '100%',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: SPACING.xl,
  },
  cardTitle: {
    marginBottom: SPACING.md,
    color: COLORS.textDark,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryLight,
  },
  specVal: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textDark,
    fontWeight: '700',
  },
  successNote: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textMedium,
    lineHeight: 18,
    backgroundColor: COLORS.success,
    padding: SPACING.md,
    borderRadius: 12,
    marginTop: SPACING.md,
  },
  logoutBtn: {
    borderColor: COLORS.secondaryDark,
  },
});
