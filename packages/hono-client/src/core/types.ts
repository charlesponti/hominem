export interface HonoError {
  error: string;
  code?: string;
  details?: unknown;
}

export type HonoResponse<T> = { success: true; data: T } | { success: false; error: HonoError };
