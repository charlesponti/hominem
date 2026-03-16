/**
 * Notes surface presentation tokens.
 *
 * Defines the shared layout geometry, spacing, surface colors, and metadata
 * hierarchy for the Notes product family across web and mobile.
 *
 * These tokens cover five canonical surfaces:
 *   - Capture shell  — quick-capture input, top-of-feed
 *   - Browse shell   — home and notes index, section lists
 *   - Note item      — list row: title, preview, metadata, tags, actions
 *   - Workspace      — note detail / edit, two-column geometry on desktop
 *   - Chat panel     — conversation aside within the workspace
 *
 * Chat transcript/composer semantics are in chat.ts.
 * Colors are in colors.ts. Radii and spacing are referenced here by value.
 */

import { colors } from './colors';
import { radii, radiiNative } from './radii';
import { spacing } from './spacing';

// ─── Layout geometry ─────────────────────────────────────────────────────────

/** Max content width shared across all primary Notes surfaces (px). */
export const NOTES_MAX_WIDTH = 768;

/**
 * Notes workspace two-column aside width (px).
 * The editor pane takes the remaining space (minmax(0, 1fr)).
 */
export const NOTES_WORKSPACE_ASIDE_WIDTH = 416;

// ─── Spacing semantics ───────────────────────────────────────────────────────

export const notesSpacing = {
  /** Outer horizontal padding for content containers. */
  pagePaddingX: spacing[4],
  /** Top padding for primary page content. */
  pagePaddingTop: spacing[5],
  /** Bottom padding for primary page content. */
  pagePaddingBottom: spacing[7],
  /** Gap between top-level page sections. */
  sectionGap: spacing[6],
  /** Padding inside card/panel surfaces (capture, workspace panels). */
  panelPaddingX: spacing[5],
  panelPaddingY: spacing[5],
  /** Gap between a section eyebrow label and the section body. */
  eyebrowGap: spacing[2],
  /** Vertical gap between items in a feed/list. */
  feedItemGap: spacing[1],
  /** Padding inside each feed item row. */
  feedItemPaddingX: spacing[5],
  feedItemPaddingY: spacing[5],
  /** Gap between note title and preview content. */
  noteContentGap: spacing[2],
  /** Gap between content and tag/action rows in a note item. */
  noteSecondaryGap: spacing[4],
  /** Gap between the workspace two-column panes. */
  workspacePaneGap: spacing[5],
  /** Internal padding of the workspace header. */
  workspaceHeaderPaddingBottom: spacing[5],
  /** Gap between workspace header title and description. */
  workspaceHeaderContentGap: spacing[2],
} as const;

// ─── Surface colors ──────────────────────────────────────────────────────────

export const notesSurfaces = {
  /** Page background — same as design-system base. */
  page: colors['bg-base'],
  /** Slightly lifted surface for cards, panels, and feed containers. */
  panel: colors['bg-base'],
  /** Hover state for interactive feed rows. */
  panelHover: colors['bg-surface'],
  /** Empty-state dashed-border panel. */
  emptyState: colors['bg-base'],
  /** Capture shell wrapper surface. */
  capture: colors['bg-base'],
  /** Icon well inside empty states and session rows. */
  iconWell: colors['bg-surface'],
} as const;

// ─── Border semantics ────────────────────────────────────────────────────────

export const notesBorders = {
  /** Standard container border (sections, panels, feed wrappers). */
  container: colors['border-default'],
  /** Subtle divider inside a list (divide-y). */
  divider: colors['border-subtle'],
  /** Dashed empty-state border. */
  emptyState: colors['border-default'],
  /** Icon well border. */
  iconWell: colors['border-default'],
} as const;

// ─── Foreground / text hierarchy ─────────────────────────────────────────────

export const notesForegrounds = {
  /** Primary text: headings, note titles. */
  primary: colors['text-primary'],
  /** Secondary text: descriptions, previews. */
  secondary: colors['text-secondary'],
  /** Tertiary text: dates, eyebrow labels, metadata. */
  tertiary: colors['text-tertiary'],
  /** Accent foreground: hashtag highlights. */
  accent: colors['text-primary'],
  /** Disabled / placeholder. */
  disabled: colors['text-disabled'],
} as const;

// ─── Radius semantics ────────────────────────────────────────────────────────

export const notesRadii = {
  /** Outer radius of major panels (capture shell, notes list wrapper). */
  panel: radii.xl,
  /** Individual feed item — typically no visible radius (full bleed list). */
  feedItem: 0,
  /** Tag / badge pill. */
  badge: radii.xl,
  /** Icon well circle. */
  iconWell: radii.xl,
  /** Action button pill shape. */
  actionButton: radii.xl,
} as const;

/** React Native-safe notes radii. */
export const notesRadiiNative = {
  ...notesRadii,
  panel: radiiNative.xl,
  badge: radiiNative.xl,
  iconWell: radiiNative.xl,
  actionButton: radiiNative.xl,
} as const;

// ─── Typography role semantics ───────────────────────────────────────────────

/**
 * CSS utility class names for the Notes text hierarchy.
 * These reference the shared type-scale utilities (heading-1…4, body-1…4)
 * defined in globals.css and document the intent of each role.
 */
export const notesTypography = {
  /** Page title (home, notes index). */
  pageTitle: 'heading-1',
  /** Page description beneath the title. */
  pageDescription: 'body-2',
  /** Small ALL-CAPS section label / eyebrow. */
  eyebrow: 'body-4',
  /** Note title in a list row or workspace header. */
  noteTitle: 'heading-4',
  /** Note body preview (truncated in list rows). */
  noteBody: 'body-2',
  /** Date / relative time stamp. */
  timestamp: 'body-4',
  /** Stat counter (e.g. session count). */
  statValue: 'heading-3',
  /** Stat label beneath a counter. */
  statLabel: 'body-4',
  /** Session row title. */
  sessionTitle: 'body-1',
  /** Section heading within a workspace aside header. */
  asideTitle: 'body-4',
  /** Workspace page title. */
  workspaceTitle: 'heading-2',
  /** Workspace subtitle / description. */
  workspaceDescription: 'body-2',
} as const;

// ─── Aggregate export ─────────────────────────────────────────────────────────

export const notesTokens = {
  maxWidth: NOTES_MAX_WIDTH,
  workspaceAsideWidth: NOTES_WORKSPACE_ASIDE_WIDTH,
  spacing: notesSpacing,
  surfaces: notesSurfaces,
  borders: notesBorders,
  foregrounds: notesForegrounds,
  radii: notesRadii,
  typography: notesTypography,
} as const;

export const notesTokensNative = {
  ...notesTokens,
  radii: notesRadiiNative,
} as const;

export type NotesToken = keyof typeof notesTokens;
