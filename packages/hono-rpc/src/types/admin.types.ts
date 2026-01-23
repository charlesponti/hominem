/**
 * Explicit Type Contracts for Admin API
 *
 * Performance Benefit: These explicit types are resolved INSTANTLY by TypeScript.
 * No complex inference, no router composition, no type instantiation explosion.
 */

// ============================================================================
// Admin RefreshGooglePlaces
// ============================================================================

export interface AdminRefreshGooglePlacesOutput {
  success: boolean;
  updatedCount: number;
  message: string;
}
