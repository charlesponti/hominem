/**
 * Canonical color tokens — Warm Terminal palette.
 *
 * Light mode: warm stone neutrals (fafaf9 base).
 * Dark mode: near-black Vercel-inspired (0a0a0a base).
 * Accent: warm amber (#D4A574) inspired by Claude's personality.
 *
 * Values MUST match the @theme block in packages/ui/src/styles/globals.css.
 * Web consumes these via CSS custom properties; other platforms (e.g. mobile
 * Restyle) import this file directly.
 */

// ─── Light mode (default) ───────────────────────────────────────────────────

export const colors = {
  // Backgrounds — warm stone neutrals
  'bg-base': '#fafaf9',
  'bg-surface': '#f5f5f0',
  'bg-elevated': '#ffffff',
  'bg-inset': '#eeedea',
  'bg-overlay': 'rgba(28, 25, 23, 0.6)',

  // Text — warm dark foreground
  'text-primary': '#1c1917',
  'text-secondary': '#57534e',
  'text-tertiary': '#a8a29e',
  'text-disabled': '#d6d3d1',

  // Borders — warm-tinted opacity scale
  'border-default': 'rgba(28, 25, 23, 0.12)',
  'border-subtle': 'rgba(28, 25, 23, 0.06)',
  'border-strong': 'rgba(28, 25, 23, 0.20)',

  // Icons
  'icon-primary': '#1c1917',
  'icon-muted': '#a8a29e',

  // Semantic status
  success: '#22C55E',
  warning: '#F59E0B',
  destructive: '#EF4444',
  'destructive-subtle': 'rgba(239, 68, 68, 0.08)',

  // Accent — warm amber (Claude-inspired)
  accent: '#D4A574',
  'accent-hover': '#C4956A',
  'accent-subtle': 'rgba(212, 165, 116, 0.12)',
  'accent-foreground': '#1c1917',

  // Vendor colors
  'google-maps-blue': '#4285F4',

  // System / backward-compat aliases
  primary: '#1c1917',
  'primary-foreground': '#fafaf9',
  secondary: 'rgba(28, 25, 23, 0.12)',
  'secondary-foreground': '#57534e',
  muted: 'rgba(28, 25, 23, 0.06)',
  'muted-foreground': '#a8a29e',
  foreground: '#1c1917',
  background: '#fafaf9',
  'destructive-foreground': '#ffffff',
  popover: '#ffffff',
  'popover-foreground': '#1c1917',
  input: '#eeedea',
  ring: '#78716c',

  // Emphasis scale — warm-tinted opacity layers
  'emphasis-highest': 'rgba(28, 25, 23, 0.9)',
  'emphasis-high': 'rgba(28, 25, 23, 0.7)',
  'emphasis-medium': 'rgba(28, 25, 23, 0.5)',
  'emphasis-low': 'rgba(28, 25, 23, 0.3)',
  'emphasis-lower': 'rgba(28, 25, 23, 0.2)',
  'emphasis-subtle': 'rgba(28, 25, 23, 0.15)',
  'emphasis-minimal': 'rgba(28, 25, 23, 0.1)',
  'emphasis-faint': 'rgba(28, 25, 23, 0.07)',

  // Modal overlays
  'overlay-modal-high': 'rgba(28, 25, 23, 0.7)',
  'overlay-modal-medium': 'rgba(28, 25, 23, 0.5)',

  // Charts — warm-tinted opacity scale
  'chart-1': 'rgba(28, 25, 23, 0.9)',
  'chart-2': 'rgba(28, 25, 23, 0.7)',
  'chart-3': 'rgba(28, 25, 23, 0.5)',
  'chart-4': 'rgba(28, 25, 23, 0.3)',
  'chart-5': 'rgba(28, 25, 23, 0.15)',

  // Sidebar — warm neutral sidebar
  sidebar: '#f5f5f0',
  'sidebar-foreground': '#1c1917',
  'sidebar-primary': '#1c1917',
  'sidebar-primary-foreground': '#fafaf9',
  'sidebar-accent': 'rgba(28, 25, 23, 0.06)',
  'sidebar-accent-foreground': '#1c1917',
  'sidebar-border': 'rgba(28, 25, 23, 0.08)',
  'sidebar-ring': '#78716c',

  // Prompt input
  'prompt-bg': '#ffffff',
  'prompt-border': 'rgba(28, 25, 23, 0.12)',
  'prompt-border-focus': 'rgba(28, 25, 23, 0.20)',

  // Primitive values
  black: '#1c1917',
  white: '#fafaf9',
} as const;

// ─── Dark mode ──────────────────────────────────────────────────────────────

export const colorsDark = {
  'bg-base': '#0a0a0a',
  'bg-surface': '#141414',
  'bg-elevated': '#1c1c1c',
  'bg-inset': '#0f0f0f',
  'bg-overlay': 'rgba(0, 0, 0, 0.7)',

  'text-primary': '#fafaf9',
  'text-secondary': '#a8a29e',
  'text-tertiary': '#78716c',
  'text-disabled': '#44403c',

  'border-default': 'rgba(250, 250, 249, 0.12)',
  'border-subtle': 'rgba(250, 250, 249, 0.06)',
  'border-strong': 'rgba(250, 250, 249, 0.20)',

  'icon-primary': '#fafaf9',
  'icon-muted': '#78716c',

  success: '#4ADE80',
  warning: '#FBBF24',
  destructive: '#F87171',
  'destructive-subtle': 'rgba(248, 113, 113, 0.12)',

  accent: '#D4A574',
  'accent-hover': '#E0B68A',
  'accent-subtle': 'rgba(212, 165, 116, 0.15)',
  'accent-foreground': '#1c1917',

  primary: '#fafaf9',
  'primary-foreground': '#0a0a0a',
  secondary: 'rgba(250, 250, 249, 0.12)',
  'secondary-foreground': '#a8a29e',
  muted: 'rgba(250, 250, 249, 0.06)',
  'muted-foreground': '#78716c',
  foreground: '#fafaf9',
  background: '#0a0a0a',
  'destructive-foreground': '#ffffff',
  popover: '#1c1c1c',
  'popover-foreground': '#fafaf9',
  input: '#0f0f0f',
  ring: '#a8a29e',

  'emphasis-highest': 'rgba(250, 250, 249, 0.9)',
  'emphasis-high': 'rgba(250, 250, 249, 0.7)',
  'emphasis-medium': 'rgba(250, 250, 249, 0.5)',
  'emphasis-low': 'rgba(250, 250, 249, 0.3)',
  'emphasis-lower': 'rgba(250, 250, 249, 0.2)',
  'emphasis-subtle': 'rgba(250, 250, 249, 0.15)',
  'emphasis-minimal': 'rgba(250, 250, 249, 0.1)',
  'emphasis-faint': 'rgba(250, 250, 249, 0.07)',

  'overlay-modal-high': 'rgba(0, 0, 0, 0.8)',
  'overlay-modal-medium': 'rgba(0, 0, 0, 0.6)',

  'chart-1': 'rgba(250, 250, 249, 0.9)',
  'chart-2': 'rgba(250, 250, 249, 0.7)',
  'chart-3': 'rgba(250, 250, 249, 0.5)',
  'chart-4': 'rgba(250, 250, 249, 0.3)',
  'chart-5': 'rgba(250, 250, 249, 0.15)',

  sidebar: '#141414',
  'sidebar-foreground': '#fafaf9',
  'sidebar-primary': '#fafaf9',
  'sidebar-primary-foreground': '#0a0a0a',
  'sidebar-accent': 'rgba(250, 250, 249, 0.06)',
  'sidebar-accent-foreground': '#fafaf9',
  'sidebar-border': 'rgba(250, 250, 249, 0.08)',
  'sidebar-ring': '#a8a29e',

  'prompt-bg': '#1c1c1c',
  'prompt-border': 'rgba(250, 250, 249, 0.12)',
  'prompt-border-focus': 'rgba(250, 250, 249, 0.20)',

  black: '#1c1917',
  white: '#fafaf9',
} as const;

export type ColorToken = keyof typeof colors;
