/**
 * DEPRECATED: client-side photo URL construction is an anti-pattern.
 * Photo URLs should be resolved server-side and returned ready-to-use to clients.
 * If you see this function being used, update the server to return a resolved `photoUrl` or
 * a pair of `thumbnail`/`full` URLs and update the client to consume those fields.
 */
export function buildPlacePhotoUrl(): never {
  throw new Error('buildPlacePhotoUrl is deprecated - use server-resolved photo URLs instead');
}
