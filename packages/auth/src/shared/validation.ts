// These are inlined on purpose instead of imported from @hominem/utils. This
// package publishes to GitHub Packages for consumers outside the monorepo
// (see README.md), but @hominem/utils is workspace-only — importing it here
// would ship an entry point external consumers can't resolve. packages/utils
// keeps its own copy for its own consumers; duplicating a one-line string
// function is cheaper than coupling a published package to an unpublished one.
export function normalizeOtp(value: string, length = 6): string {
  return value.replace(/\D/g, '').slice(0, length);
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  const normalized = normalizeEmail(value);
  const atIndex = normalized.indexOf('@');
  const domain = normalized.slice(atIndex + 1);
  return (
    atIndex > 0 &&
    atIndex === normalized.lastIndexOf('@') &&
    atIndex < normalized.length - 1 &&
    !/\s/.test(normalized) &&
    domain.includes('.')
  );
}

export function isValidOtp(value: string): boolean {
  const normalized = normalizeOtp(value);
  return /^[0-9]{6}$/.test(normalized);
}
