// Single source of truth for the brand identity. Every platform-specific
// brand object (web, mobile, desktop, API) should pull its name/tagline from
// here instead of hardcoding it elsewhere.
export const BRAND = {
  appName: 'Omiro',
  financeClientName: 'Omiro Finance',
  tagline: 'A notes-first personal workspace for capture, context, and chat.',
} as const;

export type Brand = typeof BRAND;
