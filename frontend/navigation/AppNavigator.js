import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { CycleTrackerScreen } from '../screens/CycleTrackerScreen';

const Stack = createStackNavigator();

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
    <Stack.Screen name="Dashboard" component={CycleTrackerScreen} />
  </Stack.Navigator>
);

export const AppNavigator = () => {
  const { userToken, isLoading } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigationTheme = useMemo(() => ({
    ...(theme.isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.isDark ? DarkTheme.colors : DefaultTheme.colors),
      ...theme.navigation.colors,
    },
  }), [theme]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={theme.typography.bodyMedium}>Synchronizing wellness state...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {userToken ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

const createStyles = ({ colors }) => StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
