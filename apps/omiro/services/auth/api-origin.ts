import { API_BASE_URL } from '~/constants';

export function getApiBaseOrigin() {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return API_BASE_URL;
  }
}
