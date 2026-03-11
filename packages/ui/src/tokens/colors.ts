/**
 * Canonical color tokens.
 *
 * Values MUST match the @theme block in packages/ui/src/styles/globals.css.
 * Web consumes these via CSS custom properties; other platforms (e.g. mobile
 * Restyle) import this file directly.
 */

export const colors = {
  // Backgrounds — off-black palette, opacity-based elevation
  'bg-base': '#0f1113',
  'bg-surface': '#14171a',
  'bg-elevated': '#1a1e22',
  'bg-overlay': 'rgba(255, 255, 255, 0.04)',

  // Text — off-white foreground
  'text-primary': '#e7eaee',
  'text-secondary': '#b3bac2',
  'text-tertiary': '#7a828a',
  'text-disabled': '#545b62',

  // Borders
  'border-default': 'rgba(255, 255, 255, 0.08)',
  'border-subtle': 'rgba(255, 255, 255, 0.04)',
  'border-focus': 'rgba(255, 255, 255, 0.16)',

  // Icons
  'icon-primary': '#f5f7fa',
  'icon-muted': '#aeb5bd',

  // Semantic status
  success: '#34c759',
  warning: '#ff9500',
  destructive: '#ff3b30',

  // Accent (per-product override at the CSS layer; default: cool blue)
  accent: '#7bd3f7',
  'accent-foreground': '#000000',

  // System / backward-compat aliases
  primary: '#e7eaee',
  'primary-foreground': '#0f1113',
  secondary: 'rgba(255, 255, 255, 0.1)',
  'secondary-foreground': '#b3bac2',
  muted: 'rgba(255, 255, 255, 0.05)',
  'muted-foreground': '#7a828a',
  foreground: '#e7eaee',
  background: '#0f1113',
  'destructive-foreground': '#ffffff',
  popover: '#14171a',
  'popover-foreground': '#e7eaee',
  input: '#14171a',
  ring: '#e7eaee',

  // Emphasis scale — opacity layers
  'emphasis-highest': 'rgba(255, 255, 255, 0.9)',
  'emphasis-high': 'rgba(255, 255, 255, 0.7)',
  'emphasis-medium': 'rgba(255, 255, 255, 0.5)',
  'emphasis-low': 'rgba(255, 255, 255, 0.3)',
  'emphasis-lower': 'rgba(255, 255, 255, 0.2)',
  'emphasis-subtle': 'rgba(255, 255, 255, 0.15)',
  'emphasis-minimal': 'rgba(255, 255, 255, 0.1)',
  'emphasis-faint': 'rgba(255, 255, 255, 0.05)',

  // Glass
  'glass-background': 'rgba(255, 255, 255, 0.04)',

  // Charts
  'chart-1': 'rgba(255, 255, 255, 0.9)',
  'chart-2': 'rgba(255, 255, 255, 0.7)',
  'chart-3': 'rgba(255, 255, 255, 0.5)',
  'chart-4': 'rgba(255, 255, 255, 0.3)',
  'chart-5': 'rgba(255, 255, 255, 0.15)',

  // Primitive values used by mobile shadow system
  black: '#0f1113',
  white: '#ffffff',
} as const

export type ColorToken = keyof typeof colors
