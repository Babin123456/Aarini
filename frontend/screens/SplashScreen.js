import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, ActivityIndicator, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, TYPOGRAPHY } from '../constants/theme';
import { Flower } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export const SplashScreen = ({ navigation }) => {
  // Animation values for smooth welcome fades
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Parallel animations: Fade in logo and scale up smoothly
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 10,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Once logo completes, fade in the brand texts
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        // Redirect to Login page after a calm 2-second pause
        const timer = setTimeout(() => {
          navigation.replace('Login');
        }, 2200);
        return () => clearTimeout(timer);
      });
    });
  }, [logoOpacity, logoScale, textOpacity, navigation]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.white, COLORS.primaryLight, COLORS.primary]}
        style={styles.background}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.9, y: 0.9 }}
      >
        <View style={styles.content}>
          {/* Logo Animation */}
          <Animated.View
            style={[
              styles.logoContainer,
              { opacity: logoOpacity, transform: [{ scale: logoScale }] },
            ]}
          >
            <View style={styles.flowerIcon}>
              <Flower size={48} color={COLORS.textOnPrimary} strokeWidth={1.5} />
            </View>
          </Animated.View>

          {/* Text Fades */}
          <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
            <Text style={[TYPOGRAPHY.h1, styles.brandName]}>Aarini</Text>
            <Text style={[TYPOGRAPHY.bodyLarge, styles.tagline]}>
              Hormonal Wellness & Period Companion
            </Text>
          </Animated.View>

          {/* Safe Private Indicator */}
          <Animated.View style={[styles.footerContainer, { opacity: textOpacity }]}>
            <ActivityIndicator size="small" color={COLORS.primaryDark} style={styles.loader} />
            <Text style={[TYPOGRAPHY.caption, styles.secureLabel]}>
              🔒 Secure, private, and encrypted
            </Text>
          </Animated.View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    width: '100%',
  },
  logoContainer: {
    marginBottom: 24,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
  },
  flowerIcon: {
    backgroundColor: COLORS.white,
    padding: 24,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  brandName: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
    color: COLORS.textDark,
  },
  tagline: {
    textAlign: 'center',
    color: COLORS.textMedium,
    fontSize: 15,
    paddingHorizontal: 20,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  loader: {
    marginBottom: 12,
  },
  secureLabel: {
    color: COLORS.textLight,
  },
});
