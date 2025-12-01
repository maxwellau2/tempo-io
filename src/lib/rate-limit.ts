import { LRUCache } from 'lru-cache';
import { NextRequest, NextResponse } from 'next/server';
import { RATE_LIMIT, HTTP_STATUS } from '@/lib/constants';

type RateLimitOptions = {
  uniqueTokenPerInterval?: number;
  interval?: number;
};

/**
 * Creates a rate limiter using LRU cache
 */
export function rateLimit(options?: RateLimitOptions) {
  const tokenCache = new LRUCache<string, number[]>({
    max: options?.uniqueTokenPerInterval || RATE_LIMIT.DEFAULT.MAX_TOKENS,
    ttl: options?.interval || RATE_LIMIT.DEFAULT.INTERVAL,
  });

  return {
    check: (limit: number, token: string): Promise<{ success: boolean; remaining: number }> =>
      new Promise((resolve) => {
        const tokenCount = tokenCache.get(token) || [0];

        if (tokenCount[0] === 0) {
          tokenCache.set(token, [1]);
        } else {
          tokenCount[0] += 1;
          tokenCache.set(token, tokenCount);
        }

        const currentUsage = tokenCount[0];
        const remaining = Math.max(0, limit - currentUsage);
        const success = currentUsage <= limit;

        resolve({ success, remaining });
      }),
  };
}

// Pre-configured rate limiters for different use cases
export const apiRateLimiter = rateLimit({
  interval: RATE_LIMIT.API.INTERVAL,
  uniqueTokenPerInterval: RATE_LIMIT.API.MAX_TOKENS,
});

export const authRateLimiter = rateLimit({
  interval: RATE_LIMIT.AUTH.INTERVAL,
  uniqueTokenPerInterval: RATE_LIMIT.AUTH.MAX_REQUESTS,
});

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous'
  );
}

/**
 * Rate limit middleware for API routes
 * @param request - The incoming request
 * @param limit - Maximum requests per interval (default: 10)
 * @returns NextResponse if rate limited, null otherwise
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  limit: number = RATE_LIMIT.DEFAULT.REQUESTS_PER_MINUTE
): Promise<NextResponse | null> {
  const identifier = getClientIdentifier(request);
  const { success, remaining } = await apiRateLimiter.check(limit, identifier);

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: HTTP_STATUS.TOO_MANY_REQUESTS,
        headers: {
          'Retry-After': RATE_LIMIT.RETRY_AFTER_SECONDS.toString(),
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  return null;
}
