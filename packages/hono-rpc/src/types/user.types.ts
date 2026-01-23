/**
 * Explicit Type Contracts for User API
 *
 * Performance Benefit: These explicit types are resolved INSTANTLY by TypeScript.
 * No complex inference, no router composition, no type instantiation explosion.
 */

// ============================================================================
// User DeleteAccount
// ============================================================================

export interface UserDeleteAccountOutput {
  success: boolean;
  message: string;
}
