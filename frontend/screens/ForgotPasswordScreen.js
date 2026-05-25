import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  TouchableOpacity 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { InputField } from '../components/InputField';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { Mail, CheckCircle2, ChevronLeft } from 'lucide-react-native';

export const ForgotPasswordScreen = ({ navigation }) => {
  const { resetPassword, isLoading, error: authError } = useAuth();
  
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateEmail = (text) => {
    setEmail(text);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (text.trim() === '') {
      setEmailError('Email is required.');
    } else if (!emailRegex.test(text)) {
      setEmailError('Please enter a valid email address.');
    } else {
      setEmailError(null);
    }
  };

  const handleReset = async () => {
    if (!email) {
      setEmailError('Email is required.');
      return;
    }
    if (emailError) {
      return;
    }

    const success = await resetPassword(email);
    if (success) {
      setIsSuccess(true);
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
          {/* Custom Back Button */}
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color={COLORS.textDark} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          {/* Core Content */}
          <View style={styles.content}>
            {!isSuccess ? (
              // Phase 1: Request Form
              <View style={styles.card}>
                <View style={styles.iconBadge}>
                  <Mail size={24} color={COLORS.primaryDark} />
                </View>
                <Text style={[TYPOGRAPHY.h1, styles.title]}>Reset Password</Text>
                <Text style={[TYPOGRAPHY.bodyLarge, styles.subtitle]}>
                  Enter the email address linked with your Aarini profile, and we will dispatch a secure reset link.
                </Text>

                <InputField
                  label="EMAIL ADDRESS"
                  value={email}
                  onChangeText={validateEmail}
                  placeholder="e.g., jane@example.com"
                  keyboardType="email-address"
                  error={emailError || authError}
                />

                <Button
                  title="Send Reset Link"
                  onPress={handleReset}
                  loading={isLoading}
                  style={styles.submitButton}
                />
              </View>
            ) : (
              // Phase 2: Recovery Link Sent Success Display
              <View style={[styles.card, styles.successCard]}>
                <View style={styles.successBadge}>
                  <CheckCircle2 size={40} color={COLORS.successDark} />
                </View>
                <Text style={[TYPOGRAPHY.h1, styles.title]}>Check Your Inbox</Text>
                <Text style={[TYPOGRAPHY.bodyLarge, styles.subtitle]}>
                  A password restoration link has been transmitted successfully to:{'\n'}
                  <Text style={styles.successEmail}>{email}</Text>
                </Text>
                <Text style={[TYPOGRAPHY.bodySmall, styles.noteText]}>
                  If you do not see the message in a couple of minutes, please check your spam folder.
                </Text>

                <Button
                  title="Return to Login"
                  onPress={() => navigation.navigate('Login')}
                  style={styles.submitButton}
                />
              </View>
            )}
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
    paddingHorizontal: SPACING.lg,
    paddingTop: 50,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  backText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textDark,
    fontWeight: '600',
    marginLeft: 2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: SPACING.lg,
    alignItems: 'center',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  successCard: {
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  iconBadge: {
    backgroundColor: COLORS.primaryLight,
    padding: SPACING.md,
    borderRadius: 20,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  successBadge: {
    backgroundColor: COLORS.success,
    padding: SPACING.md,
    borderRadius: 30,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: COLORS.textMedium,
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  successEmail: {
    color: COLORS.textDark,
    fontWeight: '700',
  },
  noteText: {
    textAlign: 'center',
    color: COLORS.textLight,
    lineHeight: 18,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    width: '100%',
  },
  submitButton: {
    width: '100%',
  },
});
