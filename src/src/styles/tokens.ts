/**
 * Design Tokens
 * Extracted from Figma Make AI project design system
 * Enterprise-grade procurement module styling standards
 */

// ============================================================================
// COLORS - Enterprise Theme
// ============================================================================

export const colors = {
  // Primary Brand Colors
  teal: {
    primary: 'var(--color-teal)',
    dark: 'var(--color-teal-dark)',
    light: '#00D4E6',
    50: '#E6F9FB',
    100: '#B3EEF3',
    200: '#80E3EB',
    300: '#4DD8E3',
    400: '#1ACDDB',
    500: 'var(--color-teal)',
    600: 'var(--color-teal-dark)',
    700: '#006169',
    800: '#00454B',
    900: '#00292D',
  },

  // Background Colors - Light Theme Only
  background: {
    opalWhite: 'var(--color-cloud)',
    silverGrey: 'var(--color-silver)',
    white: '#FFFFFF',
    cardWhite: '#FFFFFF',
  },

  // Text Colors
  text: {
    techBlack: 'var(--color-ink)',      // Primary text
    mercuryGrey: 'var(--color-mercury-grey)',    // Secondary text
    lightGrey: '#9BA5AD',      // Tertiary text
    mutedGrey: '#C4CCD1',      // Disabled text
  },

  // Navigation - Dark Theme Sidebar
  navigation: {
    background: 'var(--color-ink)',
    text: '#FFFFFF',
    textMuted: '#9BA5AD',
    activeBackground: 'var(--color-teal)',
    activeText: '#FFFFFF',
    hoverBackground: '#1A2228',
    border: '#1F2931',
  },

  // Semantic Colors
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },

  // Border & Divider
  border: {
    light: 'var(--color-silver)',
    medium: '#C4CCD1',
    dark: '#9BA5AD',
    subtle: 'rgba(0, 0, 0, 0.1)',
  },

  // State Colors
  state: {
    hover: 'rgba(0, 169, 183, 0.08)',
    active: 'rgba(0, 169, 183, 0.12)',
    focus: 'rgba(0, 169, 183, 0.16)',
    disabled: 'var(--color-cloud)',
  },
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  fontFamily: {
    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },

  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
  },

  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },

  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
  },
} as const;

// ============================================================================
// SPACING
// ============================================================================

export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
} as const;

// ============================================================================
// LAYOUT
// ============================================================================

export const layout = {
  sidebar: {
    width: '260px',
    collapsedWidth: '72px',
  },
  header: {
    height: '64px',
  },
  container: {
    maxWidth: '1440px',
  },
  card: {
    padding: '24px',
  },
} as const;

// ============================================================================
// BORDERS & RADIUS
// ============================================================================

export const borders = {
  width: {
    thin: '1px',
    medium: '2px',
    thick: '4px',
  },
  radius: {
    none: '0',
    sm: '0.25rem',    // 4px
    md: '0.5rem',     // 8px
    lg: '0.625rem',   // 10px
    xl: '1rem',       // 16px
    full: '9999px',
  },
} as const;

// ============================================================================
// SHADOWS
// ============================================================================

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
} as const;

// ============================================================================
// Z-INDEX
// ============================================================================

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

// ============================================================================
// TRANSITIONS
// ============================================================================

export const transitions = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  },
  easing: {
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// ============================================================================
// BREAKPOINTS
// ============================================================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Colors = typeof colors;
export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type Layout = typeof layout;
export type Borders = typeof borders;
export type Shadows = typeof shadows;
export type ZIndex = typeof zIndex;
export type Transitions = typeof transitions;
export type Breakpoints = typeof breakpoints;

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

const tokens = {
  colors,
  typography,
  spacing,
  layout,
  borders,
  shadows,
  zIndex,
  transitions,
  breakpoints,
} as const;

export default tokens;
