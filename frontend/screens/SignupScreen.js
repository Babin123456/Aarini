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
import { Heart } from 'lucide-react-native';

export const SignupScreen = ({ navigation }) => {
  const { signup, isLoading, error: authError } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { colors, typography } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  // Step state (1: Account info, 2: Wellness specs)
  const [step, setStep] = useState(1);
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [age, setAge] = useState('');
  const [cycleLength, setCycleLength] = useState('28'); // Default standard average cycle
  
  // Error states
  const [errors, setErrors] = useState({});

  const getPasswordStrength = (pass) => {
    if (!pass) return null;
    if (pass.length < 6) return 'Weak';
    
    const onlyDigits = /^\d+$/.test(pass);
    if (onlyDigits) return 'Weak';
    
    const hasUppercase = /[A-Z]/.test(pass);
    const hasLowercase = /[a-z]/.test(pass);
    const hasNumberOrSpecial = /[\d\W_]/.test(pass);
    
    if (pass.length >= 8 && hasUppercase && hasLowercase && hasNumberOrSpecial) {
      return 'Strong';
    }
    
    const hasLetters = /[a-zA-Z]/.test(pass);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pass);
    
    if (pass.length >= 6 && hasLetters && !hasSpecial && pass.length < 10) {
      return 'Medium';
    }
    
    return 'Medium';
  };

  // Real-time validators
  const handleValidateStep1 = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!name.trim()) {
      newErrors.name = t('validation.nameRequired');
    }
    
    if (!email.trim()) {
      newErrors.email = t('validation.emailRequired');
    } else if (!emailRegex.test(email)) {
      newErrors.email = t('validation.emailInvalid');
    }
    
    if (!password) {
      newErrors.password = t('validation.passwordRequired');
    } else if (password.length < 6) {
      newErrors.password = t('validation.passwordLength');
    } else if (getPasswordStrength(password) === 'Weak') {
      newErrors.password = t('validation.passwordWeak');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleValidateStep2 = () => {
    const newErrors = {};
    const ageVal = parseInt(age, 10);
    const cycleVal = parseInt(cycleLength, 10);
    
    if (!age.trim()) {
      newErrors.age = t('validation.ageRequired');
    } else if (isNaN(ageVal) || ageVal < 10 || ageVal > 90) {
      newErrors.age = t('validation.ageInvalid');
    }
    
    if (!cycleLength.trim()) {
      newErrors.cycleLength = t('validation.cycleLengthRequired');
    } else if (isNaN(cycleVal) || cycleVal < 15 || cycleVal > 60) {
      newErrors.cycleLength = t('validation.cycleLengthInvalid');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (handleValidateStep1()) {
      setStep(2);
    }
  };

  const handlePrevStep = () => {
    setStep(1);
    setErrors({});
  };

  const handleRegister = async () => {
    if (!handleValidateStep2()) {
      return;
    }

    const success = await signup(
      name,
      email,
      password,
      age,
      cycleLength
    );

    if (!success) {
      Alert.alert('Signup Failed', authError || 'An error occurred during account creation.');
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
          {/* Progress Indicator */}
          <View style={styles.progressContainer} accessibilityRole="progressbar" accessibilityLabel={`Step ${step} of 2`}>
            <View style={[styles.progressBar, step >= 1 && styles.activeProgress]} />
            <View style={[styles.progressBar, step >= 2 && styles.activeProgress]} />
          </View>

          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.iconBadge} importantForAccessibility="no">
              <Heart size={24} color={colors.secondaryDark} />
            </View>
            <Text style={[typography.h1, styles.title]}>
              {step === 1 ? t('signup.title') : t('signup.cycleTitle')}
            </Text>
            <Text style={[typography.bodyLarge, styles.subtitle]}>
              {step === 1 
                ? t('signup.subtitle') 
                : t('signup.cycleSubtitle')
              }
            </Text>
          </View>

          {/* Card Form container */}
          <View style={styles.form}>
            {step === 1 ? (
              // Step 1 Layout
              <View>
                <InputField
                  label={t('signup.nameLabel')}
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (errors.name) setErrors({...errors, name: null});
                  }}
                  placeholder="e.g., Sarah Jenkins"
                  autoCapitalize="words"
                  error={errors.name}
                />

                <InputField
                  label={t('signup.emailLabel')}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors({...errors, email: null});
                  }}
                  placeholder="e.g., sarah@example.com"
                  keyboardType="email-address"
                  error={errors.email}
                />

                <InputField
                  label={t('signup.passwordLabel')}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setPasswordStrength(getPasswordStrength(text));
                    if (errors.password) setErrors({...errors, password: null});
                  }}
                  placeholder="Minimum 6 characters"
                  secureTextEntry={true}
                  error={errors.password}
                />

                {passwordStrength && (
                  <View style={{ marginTop: 4, marginBottom: 8 }} accessibilityLabel={`Password strength: ${passwordStrength}`}>
                    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                      <View style={{ 
                        flex: 1, 
                        height: 4, 
                        borderRadius: 2, 
                        marginHorizontal: 2, 
                        backgroundColor: passwordStrength === 'Weak' ? colors.errorDark : (passwordStrength === 'Medium' ? '#F59E0B' : colors.successDark) 
                      }} />
                      <View style={{ 
                        flex: 1, 
                        height: 4, 
                        borderRadius: 2, 
                        marginHorizontal: 2, 
                        backgroundColor: passwordStrength === 'Medium' ? '#F59E0B' : (passwordStrength === 'Strong' ? colors.successDark : colors.border) 
                      }} />
                      <View style={{ 
                        flex: 1, 
                        height: 4, 
                        borderRadius: 2, 
                        marginHorizontal: 2, 
                        backgroundColor: passwordStrength === 'Strong' ? colors.successDark : colors.border 
                      }} />
                    </View>
                    <Text style={{ 
                      fontSize: 12, 
                      fontWeight: '600', 
                      marginHorizontal: 2,
                      color: passwordStrength === 'Weak' ? colors.errorDark : (passwordStrength === 'Medium' ? '#F59E0B' : colors.successDark) 
                    }}>
                      {passwordStrength}
                    </Text>
                  </View>
                )}

                <Button
                  title={t('signup.next')}
                  onPress={handleNextStep}
                  style={styles.submitButton}
                />
              </View>
            ) : (
              // Step 2 Layout
              <View>
                <InputField
                  label="YOUR AGE"
                  value={age}
                  onChangeText={(text) => {
                    setAge(text);
                    if (errors.age) setErrors({...errors, age: null});
                  }}
                  placeholder="e.g., 23"
                  keyboardType="number-pad"
                  error={errors.age}
                />

                <InputField
                  label="TYPICAL CYCLE LENGTH (DAYS)"
                  value={cycleLength}
                  onChangeText={(text) => {
                    setCycleLength(text);
                    if (errors.cycleLength) setErrors({...errors, cycleLength: null});
                  }}
                  placeholder="Average cycle length is 28 days"
                  keyboardType="number-pad"
                  error={errors.cycleLength}
                />
                
                <Text style={styles.helperText}>
                  💡 Average cycle duration spans 25-35 days. If you are irregular or unsure, you can leave it as 28 and adjust it anytime in settings.
                </Text>

                <View style={styles.btnRow}>
                  <Button
                    title={t('signup.back')}
                    variant="outline"
                    onPress={handlePrevStep}
                    style={styles.halfBtn}
                  />
                  <Button
                    title={t('signup.createAccount')}
                    onPress={handleRegister}
                    loading={isLoading}
                    style={styles.halfBtn}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Switch back to Login option */}
          <View style={styles.footer}>
            <Text style={[typography.bodyMedium, styles.footerText]}>
              {t('signup.haveAccount')}{' '}
            </Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.7}
              accessibilityRole="link"
              accessibilityLabel={t('signup.signIn')}
            >
              <Text style={styles.loginLink}>{t('signup.signIn')}</Text>
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
    paddingTop: 50,
    paddingBottom: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 6,
    width: 48,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  activeProgress: {
    backgroundColor: colors.primaryDark,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconBadge: {
    backgroundColor: colors.cardBackground,
    padding: spacing.md,
    borderRadius: 20,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.secondary,
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
  submitButton: {
    marginTop: spacing.md,
  },
  helperText: {
    ...typography.bodySmall,
    color: colors.textMedium,
    lineHeight: 16,
    backgroundColor: colors.mutedBackground,
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  halfBtn: {
    flex: 1,
    width: 'auto',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    color: colors.textMedium,
  },
  loginLink: {
    ...typography.bodyMedium,
    color: colors.primaryDark,
    fontWeight: '700',
  },
});
