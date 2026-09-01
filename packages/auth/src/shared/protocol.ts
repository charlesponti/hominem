// Auth protocol constants and types — just protocol-level stuff like token
// expiry and session constraints. App-specific routing belongs in each app.

// Needs to match AUTH_EMAIL_OTP_EXPIRES_SECONDS on the server (default 300)
export const OTP_EXPIRES_SECONDS = 300;
