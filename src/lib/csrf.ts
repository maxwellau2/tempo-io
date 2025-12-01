import { NextRequest, NextResponse } from 'next/server';

/**
 * Allowed origins for CSRF protection
 * Add your production domain here
 */
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean) as string[];

/**
 * Validates the request origin against allowed origins
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Allow same-origin requests (no origin header for same-origin)
  if (!origin) {
    return true;
  }

  // Check against allowed origins
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }

  // Check referer as fallback
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return ALLOWED_ORIGINS.includes(refererUrl.origin);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * CSRF protection middleware for API routes
 * Returns an error response if the origin is invalid, null otherwise
 */
export function csrfProtection(request: NextRequest): NextResponse | null {
  if (!validateOrigin(request)) {
    return NextResponse.json(
      { error: 'Forbidden - Invalid origin' },
      { status: 403 }
    );
  }
  return null;
}

/**
 * Helper to wrap API handlers with CSRF protection
 */
export function withCsrfProtection<T>(
  handler: (request: NextRequest) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest): Promise<NextResponse<T | { error: string }>> => {
    const csrfError = csrfProtection(request);
    if (csrfError) return csrfError as NextResponse<{ error: string }>;
    return handler(request);
  };
}
