type HeaderCarrier = {
  req: {
    header: (name: string) => string | undefined;
  };
};

export function getClientIp(c: HeaderCarrier) {
  const realIp = c.req.header('x-real-ip')?.trim();
  if (realIp) return realIp;

  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded && forwarded.length > 0) {
    const [first] = forwarded.split(',');
    if (first?.trim()) return first.trim();
  }

  return 'unknown';
}
