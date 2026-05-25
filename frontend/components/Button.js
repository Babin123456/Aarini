import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, SPACING } from '../constants/theme';

export const Button = ({
  onPress,
  title,
  variant = 'primary', // primary, secondary, outline, text
  loading = false,
  disabled = false,
  style = {},
  textStyle = {},
  icon,
}) => {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isOutline = variant === 'outline';
  const isText = variant === 'text';

  const buttonStyles = [
    styles.base,
    isPrimary && styles.primary,
    isSecondary && styles.secondary,
    isOutline && styles.outline,
    isText && styles.text,
    disabled && styles.disabled,
    style,
  ];

  const labelStyles = [
    TYPOGRAPHY.buttonText,
    isPrimary && styles.primaryLabel,
    isSecondary && styles.secondaryLabel,
    isOutline && styles.outlineLabel,
    isText && styles.textLabel,
    disabled && styles.disabledLabel,
    textStyle,
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={buttonStyles}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={isPrimary ? COLORS.textOnPrimary : COLORS.primaryDark} 
        />
      ) : (
        <>
          {icon && <span style={styles.iconContainer}>{icon}</span>}
          <Text style={labelStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: BORDER_RADIUS.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    marginVertical: SPACING.sm,
    width: '100%',
  },
  primary: {
    backgroundColor: COLORS.primaryDark,
    ...SHADOWS.light,
  },
  secondary: {
    backgroundColor: COLORS.secondary,
    ...SHADOWS.light,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primaryDark,
  },
  text: {
    backgroundColor: 'transparent',
    height: 'auto',
    paddingHorizontal: 0,
    marginVertical: SPACING.xs,
    width: 'auto',
  },
  disabled: {
    backgroundColor: '#F3F0FC',
    borderColor: '#E6E2F8',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryLabel: {
    color: COLORS.white,
  },
  secondaryLabel: {
    color: COLORS.textOnPrimary,
  },
  outlineLabel: {
    color: COLORS.primaryDark,
  },
  textLabel: {
    color: COLORS.primaryDark,
    fontSize: 14,
  },
  disabledLabel: {
    color: COLORS.textLight,
  },
  iconContainer: {
    marginRight: SPACING.sm,
  },
});
