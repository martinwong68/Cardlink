// In-memory rate limiter. Suitable for single-instance deployments.
// For production serverless/multi-instance environments, replace with Redis or database-backed storage.
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(options: { windowMs: number; max: number }) {
  return function checkRateLimit(identifier: string): {
    allowed: boolean;
    remaining: number;
  } {
    const now = Date.now();
    const record = rateLimitMap.get(identifier);

    if (!record || now > record.resetTime) {
      rateLimitMap.set(identifier, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      return { allowed: true, remaining: options.max - 1 };
    }

    if (record.count >= options.max) {
      return { allowed: false, remaining: 0 };
    }

    record.count++;
    return { allowed: true, remaining: options.max - record.count };
  };
}
