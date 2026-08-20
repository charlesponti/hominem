export const OFFLINE_UNAVAILABLE_ERROR = 'offline_unavailable';

export function isOfflineUnavailable(error: unknown): boolean {
  return error instanceof Error && error.message === OFFLINE_UNAVAILABLE_ERROR;
}
