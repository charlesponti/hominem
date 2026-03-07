import { env } from '../env';

export interface OtpRecord {
  email: string;
  otp: string;
  type: string;
  createdAt: number;
  expiresAt: number;
}

const otpRecords = new Map<string, OtpRecord[]>();

function getRecordKey(email: string) {
  return email.trim().toLowerCase();
}

function getNowMs() {
  return Date.now();
}

function pruneExpired(records: OtpRecord[], nowMs: number) {
  return records.filter((record) => record.expiresAt > nowMs);
}

export function isTestOtpStoreEnabled() {
  if (!env.AUTH_TEST_OTP_ENABLED) {
    return false;
  }
  return env.NODE_ENV !== 'production';
}

export function recordTestOtp(input: { email: string; otp: string; type: string }) {
  if (!isTestOtpStoreEnabled()) {
    return;
  }

  const nowMs = getNowMs();
  const ttlMs = Math.max(1, env.AUTH_TEST_OTP_TTL_SECONDS) * 1000;
  const key = getRecordKey(input.email);
  const next = pruneExpired(otpRecords.get(key) ?? [], nowMs);
  next.push({
    email: key,
    otp: input.otp,
    type: input.type,
    createdAt: nowMs,
    expiresAt: nowMs + ttlMs,
  });
  otpRecords.set(key, next);
}

export function getLatestTestOtp(input: { email: string; type?: string | undefined }) {
  const nowMs = getNowMs();
  const key = getRecordKey(input.email);
  const records = pruneExpired(otpRecords.get(key) ?? [], nowMs);
  otpRecords.set(key, records);

  for (let i = records.length - 1; i >= 0; i -= 1) {
    const current = records[i];
    if (!current) {
      continue;
    }
    if (input.type && current.type !== input.type) {
      continue;
    }
    return current;
  }

  return null;
}

export function clearTestOtpStore(input?: { email?: string | undefined }) {
  if (!input?.email) {
    otpRecords.clear();
    return;
  }
  otpRecords.delete(getRecordKey(input.email));
}
