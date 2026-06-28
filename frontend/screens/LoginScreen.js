import React, { useMemo, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  TouchableOpacity, 
  Alert 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { InputField } from '../components/InputField';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { Sparkles } from 'lucide-react-native';

export const LoginScreen = ({ navigation }) => {
  const { login, isLoading, error: authError, sessionExpired } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { colors, typography } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Validation state
  const [emailError, setEmailError] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  // Email Validation regex
  const validateEmail = (text) => {
    setEmail(text);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (text.trim() === '') {
      setEmailError(t('validation.emailRequired'));
    } else if (!emailRegex.test(text)) {
      setEmailError(t('validation.emailInvalid'));
    } else {
      setEmailError(null);
    }
  };

  const validatePassword = (text) => {
    setPassword(text);
    if (text.trim() === '') {
      setPasswordError(t('validation.passwordRequired'));
    } else if (text.length < 6) {
      setPasswordError(t('validation.passwordTooShort'));
    } else {
      setPasswordError(null);
    }
  };

  const handleLogin = async () => {
    let valid = true;
    if (!email) {
      setEmailError(t('validation.emailRequired'));
      valid = false;
    }
    if (!password) {
      setPasswordError(t('validation.passwordRequired'));
      valid = false;
    }

    if (!valid || emailError || passwordError) {
      return;
    }

    const success = await login(email, password);
    if (!success) {
      Alert.alert(t('login.loginError'), authError || t('login.loginFailed'));
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <LinearGradient
        colors={theme.gradient}
        style={styles.background}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.iconBadge} importantForAccessibility="no">
              <Sparkles size={24} color={colors.primaryDark} />
            </View>
            <Text style={[typography.h1, styles.title]}>{t('login.title')}</Text>
            <Text style={[typography.bodyLarge, styles.subtitle]}>
              {t('login.subtitle')}
            </Text>
            {sessionExpired && (
              <View
                style={{ backgroundColor: colors.error, borderRadius: 8, padding: 12, marginTop: 12 }}
                accessibilityLiveRegion="polite"
                accessibilityRole="alert"
              >
                <Text style={{ color: colors.errorDark, fontSize: 13, fontWeight: '500', textAlign: 'center' }}>
                  {t('login.sessionExpired')}
                </Text>
              </View>
            )}
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            <InputField
              label={t('login.emailLabel')}
              value={email}
              onChangeText={validateEmail}
              placeholder={t('login.emailPlaceholder')}
              keyboardType="email-address"
              error={emailError}
            />

            <InputField
              label={t('login.passwordLabel')}
              value={password}
              onChangeText={validatePassword}
              placeholder={t('login.passwordPlaceholder')}
              secureTextEntry={true}
              error={passwordError}
            />

            <TouchableOpacity 
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotContainer}
              activeOpacity={0.7}
              accessibilityRole="link"
              accessibilityLabel={t('login.forgotPassword')}
            >
              <Text style={styles.forgotText}>{t('login.forgotPassword')}</Text>
            </TouchableOpacity>

            <Button
              title={t('login.signIn')}
              onPress={handleLogin}
              loading={isLoading}
              style={styles.submitButton}
            />

            <View style={styles.demoBanner} importantForAccessibility="no">
              <Text style={styles.demoText}>
                {t('login.demoHint')}
              </Text>
            </View>
          </View>

          {/* Bottom Onboarding Switch Link */}
          <View style={styles.footer}>
            <Text style={[typography.bodyMedium, styles.footerText]}>
              {t('login.noAccount')}{' '}
            </Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Signup')}
              activeOpacity={0.7}
              accessibilityRole="link"
              accessibilityLabel={t('login.createAccount')}
            >
              <Text style={styles.signupLink}>{t('login.createAccount')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const createStyles = ({ colors, typography, spacing }) => StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconBadge: {
    backgroundColor: colors.cardBackground,
    padding: spacing.md,
    borderRadius: 20,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: spacing.xs,
  },
  subtitle: {
    textAlign: 'center',
    color: colors.textMedium,
    paddingHorizontal: 20,
  },
  form: {
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 4,
  },
  forgotContainer: {
    alignSelf: 'flex-end',
    marginVertical: spacing.xs,
  },
  forgotText: {
    ...typography.bodySmall,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: spacing.md,
  },
  demoBanner: {
    backgroundColor: colors.mutedBackground,
    padding: spacing.sm,
    borderRadius: 12,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoText: {
    ...typography.bodySmall,
    color: colors.textOnSoft,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    color: colors.textMedium,
  },
  signupLink: {
    ...typography.bodyMedium,
    color: colors.primaryDark,
    fontWeight: '700',
  },
});
