// Test OTP store for e2e tests

type TestOtpRecord = {
  email: string;
  otp: string;
  type: string;
  createdAt: Date;
  expiresAt: Date;
};

const otpStore = new Map<string, TestOtpRecord>();
let storeEnabled = false;

export function isTestOtpStoreEnabled(): boolean {
  return storeEnabled;
}

export function enableTestOtpStore(): void {
  storeEnabled = true;
}

export function getLatestTestOtp(input: { email: string; type?: string }): TestOtpRecord | null {
  if (!storeEnabled) return null;

  if (input.type) {
    return otpStore.get(`${input.email}:${input.type}`) ?? null;
  }

  // Prefer exact email-only key, else any typed record for this email.
  const direct = otpStore.get(input.email);
  if (direct) return direct;

  for (const [key, record] of otpStore.entries()) {
    if (key === input.email || key.startsWith(`${input.email}:`)) {
      return record;
    }
  }
  return null;
}

export function recordTestOtp(
  emailOrInput: string | { email: string; otp: string; type?: string },
  otp?: string,
  type?: string,
): void {
  enableTestOtpStore();

  const now = new Date();
  let email: string;
  let otpValue: string;
  let typeValue: string;

  if (typeof emailOrInput === 'string') {
    email = emailOrInput;
    otpValue = otp ?? '';
    typeValue = type ?? 'sign-in';
  } else {
    email = emailOrInput.email;
    otpValue = emailOrInput.otp;
    typeValue = emailOrInput.type ?? 'sign-in';
  }

  const record: TestOtpRecord = {
    email,
    otp: otpValue,
    type: typeValue,
    createdAt: now,
    expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
  };

  otpStore.set(`${email}:${typeValue}`, record);
  otpStore.set(email, record);
}

export function clearTestOtpStore(): void {
  otpStore.clear();
}
