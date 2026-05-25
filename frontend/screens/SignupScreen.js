import React, { useState } from 'react';
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
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { InputField } from '../components/InputField';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { Heart } from 'lucide-react-native';

export const SignupScreen = ({ navigation }) => {
  const { signup, isLoading, error: authError } = useAuth();
  
  // Step state (1: Account info, 2: Wellness specs)
  const [step, setStep] = useState(1);
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [cycleLength, setCycleLength] = useState('28'); // Default standard average cycle
  
  // Error states
  const [errors, setErrors] = useState({});

  // Real-time validators
  const handleValidateStep1 = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!name.trim()) {
      newErrors.name = 'Full name is required.';
    }
    
    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Enter a valid email address.';
    }
    
    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleValidateStep2 = () => {
    const newErrors = {};
    const ageVal = parseInt(age, 10);
    const cycleVal = parseInt(cycleLength, 10);
    
    if (!age.trim()) {
      newErrors.age = 'Age is required.';
    } else if (isNaN(ageVal) || ageVal < 10 || ageVal > 90) {
      newErrors.age = 'Please enter a valid age.';
    }
    
    if (!cycleLength.trim()) {
      newErrors.cycleLength = 'Cycle length is required.';
    } else if (isNaN(cycleVal) || cycleVal < 15 || cycleVal > 60) {
      newErrors.cycleLength = 'Enter a realistic cycle length (15-60 days).';
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
        colors={[COLORS.background, COLORS.primaryLight]}
        style={styles.background}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, step >= 1 && styles.activeProgress]} />
            <View style={[styles.progressBar, step >= 2 && styles.activeProgress]} />
          </View>

          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.iconBadge}>
              <Heart size={24} color={COLORS.secondaryDark} />
            </View>
            <Text style={[TYPOGRAPHY.h1, styles.title]}>
              {step === 1 ? 'Create Account' : 'About Your Cycle'}
            </Text>
            <Text style={[TYPOGRAPHY.bodyLarge, styles.subtitle]}>
              {step === 1 
                ? 'Join Aarini to understand and support your hormonal patterns.' 
                : 'Help us calibrate predictions for period forecasts and insights.'
              }
            </Text>
          </View>

          {/* Card Form container */}
          <View style={styles.form}>
            {step === 1 ? (
              // Step 1 Layout
              <View>
                <InputField
                  label="FULL NAME"
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
                  label="EMAIL ADDRESS"
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
                  label="PASSWORD"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors({...errors, password: null});
                  }}
                  placeholder="Minimum 6 characters"
                  secureTextEntry={true}
                  error={errors.password}
                />

                <Button
                  title="Next Step"
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
                    title="Back"
                    variant="outline"
                    onPress={handlePrevStep}
                    style={styles.halfBtn}
                  />
                  <Button
                    title="Complete"
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
            <Text style={[TYPOGRAPHY.bodyMedium, styles.footerText]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.7}
            >
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 50,
    paddingBottom: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: SPACING.md,
  },
  progressBar: {
    height: 6,
    width: 48,
    borderRadius: 3,
    backgroundColor: '#E6E2F8',
  },
  activeProgress: {
    backgroundColor: COLORS.primaryDark,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  iconBadge: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 20,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    textAlign: 'center',
    color: COLORS.textMedium,
    paddingHorizontal: 20,
  },
  form: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: SPACING.lg,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  submitButton: {
    marginTop: SPACING.md,
  },
  helperText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textMedium,
    lineHeight: 16,
    backgroundColor: COLORS.primaryLight,
    padding: SPACING.md,
    borderRadius: 12,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  halfBtn: {
    flex: 1,
    width: 'auto',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  footerText: {
    color: COLORS.textMedium,
  },
  loginLink: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.primaryDark,
    fontWeight: '700',
  },
});
