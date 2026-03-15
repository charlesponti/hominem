/**
 * Canonical color tokens.
 *
 * Values MUST match the @theme block in packages/ui/src/styles/globals.css.
 * Web consumes these via CSS custom properties; other platforms (e.g. mobile
 * Restyle) import this file directly.
 */

export const colors = {
  // Backgrounds — light palette per Apple HIG
  'bg-base': '#ffffff',
  'bg-surface': '#f5f5f7',
  'bg-elevated': '#f2f2f7',
  'bg-overlay': 'rgba(0, 0, 0, 0.04)',

  // Text — dark foreground per Apple HIG
  'text-primary': '#000000',
  'text-secondary': '#555555',
  'text-tertiary': '#888888',
  'text-disabled': '#cccccc',

  // Borders — opacity scale on black
  'border-default': 'rgba(0, 0, 0, 0.1)',
  'border-subtle': 'rgba(0, 0, 0, 0.05)',
  'border-focus': 'rgba(0, 0, 0, 0.15)',

  // Icons
  'icon-primary': '#000000',
  'icon-muted': '#888888',

  // Semantic status
  success: '#34c759',
  warning: '#ff9500',
  destructive: '#ff3b30',
  'destructive-muted': 'rgba(255, 59, 48, 0.65)',

  // Accent (Apple Blue per HIG; can be overridden per-product)
  accent: '#007AFF',
  'accent-foreground': '#ffffff',

  // Vendor colors
  'google-maps-blue': '#4285F4', // Google Maps standard marker color

  // System / backward-compat aliases
  primary: '#000000',
  'primary-foreground': '#ffffff',
  secondary: 'rgba(0, 0, 0, 0.1)',
  'secondary-foreground': '#555555',
  muted: 'rgba(0, 0, 0, 0.05)',
  'muted-foreground': '#888888',
  foreground: '#000000',
  background: '#ffffff',
  'destructive-foreground': '#ffffff',
  popover: '#f5f5f7',
  'popover-foreground': '#000000',
  input: '#f5f5f7',
  ring: '#007AFF',

  // Emphasis scale — opacity layers on black
  'emphasis-highest': 'rgba(0, 0, 0, 0.9)',
  'emphasis-high': 'rgba(0, 0, 0, 0.7)',
  'emphasis-medium': 'rgba(0, 0, 0, 0.5)',
  'emphasis-low': 'rgba(0, 0, 0, 0.3)',
  'emphasis-lower': 'rgba(0, 0, 0, 0.2)',
  'emphasis-subtle': 'rgba(0, 0, 0, 0.15)',
  'emphasis-minimal': 'rgba(0, 0, 0, 0.1)',
  'emphasis-faint': 'rgba(0, 0, 0, 0.05)',

  // Modal overlays — darkens background for sheet/modal UI
  'overlay-modal-high': 'rgba(0, 0, 0, 0.6)',
  'overlay-modal-medium': 'rgba(0, 0, 0, 0.45)',

  // Charts — opacity scale on black
  'chart-1': 'rgba(0, 0, 0, 0.9)',
  'chart-2': 'rgba(0, 0, 0, 0.7)',
  'chart-3': 'rgba(0, 0, 0, 0.5)',
  'chart-4': 'rgba(0, 0, 0, 0.3)',
  'chart-5': 'rgba(0, 0, 0, 0.15)',

  // Primitive values used by mobile shadow system
  black: '#000000',
  white: '#ffffff',
} as const;

export type ColorToken = keyof typeof colors;
