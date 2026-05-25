import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SPACING } from '../constants/theme';
import { Eye, EyeOff } from 'lucide-react-native';

export const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  error = null,
  keyboardType = 'default',
  autoCapitalize = 'none',
  containerStyle = {},
  inputStyle = {},
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const hasError = !!error;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View 
        style={[
          styles.inputContainer,
          isFocused && styles.focusedBorder,
          hasError && styles.errorBorder,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textLight}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={[styles.input, TYPOGRAPHY.bodyLarge, inputStyle]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {secureTextEntry && (
          <TouchableOpacity 
            onPress={togglePasswordVisibility} 
            activeOpacity={0.7}
            style={styles.eyeButton}
          >
            {isPasswordVisible ? (
              <EyeOff size={20} color={COLORS.textMedium} />
            ) : (
              <Eye size={20} color={COLORS.textMedium} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {hasError && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: SPACING.sm,
  },
  label: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textMedium,
    fontWeight: '600',
    marginBottom: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  inputContainer: {
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: '#E6E2F8',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    overflow: 'hidden',
  },
  focusedBorder: {
    borderColor: COLORS.primaryDark,
    backgroundColor: COLORS.white,
  },
  errorBorder: {
    borderColor: COLORS.secondaryDark,
    backgroundColor: COLORS.error,
  },
  input: {
    flex: 1,
    height: '100%',
    color: COLORS.textDark,
  },
  eyeButton: {
    padding: SPACING.xs,
  },
  errorText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.secondaryDark,
    fontWeight: '500',
    marginTop: SPACING.xs,
    marginLeft: SPACING.xs,
  },
});
