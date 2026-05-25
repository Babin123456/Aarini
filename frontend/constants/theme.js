/**
 * Aarini Design System Theme Tokens
 * Contains the visual style parameters for color palettes, spacing, typography, and premium elements.
 */

export const COLORS = {
  // Primary Brand Pastel Palette
  primary: '#E6E2F8',         // Gentle Lavender base
  primaryDark: '#B9AEE5',     // Soft Purple (accent borders and active items)
  primaryLight: '#F3F0FC',    // Ultra-light Lavender (cards, backgrounds)
  
  secondary: '#FFDFE5',       // Soft Pastel Pink (period phases, flow markers)
  secondaryDark: '#FF9EAE',   // Deeper Rose (high intensity logs)
  
  accent: '#FFE5D9',          // Creamy Pastel Peach (ovulation phase, energy logs)
  accentDark: '#F4A261',      // Deep Peach (ovulation spikes)
  
  success: '#E8F5E9',         // Muted Green (healthy notes, confirmations)
  successDark: '#4CAF50',
  
  error: '#FFEBEE',           // Gentle Rose Red (invalid fields)
  errorDark: '#E53935',
  
  // Neutral UI Scales
  white: '#FFFFFF',
  background: '#F9F8FD',      // Calming off-white purple
  cardBackground: '#FFFFFF',
  
  // Readable Typography Color Palette
  textDark: '#2C2543',        // Elegant deep charcoal with a purple tint (headings)
  textMedium: '#5C5470',      // Soft gray-purple (paragraphs, descriptions)
  textLight: '#9E97B2',       // Subdued placeholder texts
  textOnPrimary: '#4B3F72',   // Readable contrast text for lavender buttons
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 14,                     // Calm, friendly rounded inputs
  lg: 24,                     // Highly aesthetic rounded cards
  xl: 32,                     // Soft round button profiles
  round: 999,
};

export const SHADOWS = {
  // Premium subtle shadows to convey professional card elevations
  light: {
    shadowColor: '#B9AEE5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  medium: {
    shadowColor: '#B9AEE5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  glass: {
    shadowColor: '#B9AEE5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  }
};

export const TYPOGRAPHY = {
  // Standard scale relying on system fonts, optimized for Android & iOS readability
  h1: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textDark,
    lineHeight: 34,
  },
  h2: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.textDark,
    lineHeight: 28,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
    lineHeight: 24,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textMedium,
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textMedium,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textLight,
    lineHeight: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textOnPrimary,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textLight,
    letterSpacing: 0.5,
  }
};
