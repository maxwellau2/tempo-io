import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { csrfProtection } from '@/lib/csrf';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { COOKIE_CONFIG, RATE_LIMIT, HTTP_STATUS } from '@/lib/constants';

// Secure cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // HTTPS in production, HTTP allowed in dev
  sameSite: 'lax' as const, // Lax allows the cookie to be sent on OAuth redirects
  path: '/',
};

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      // Don't log sensitive token response data
      console.error('Failed to refresh Google token');
      return null;
    }

    return response.json();
  } catch (error) {
    // Log error type without sensitive details
    console.error('Token refresh error:', error instanceof Error ? error.name : 'Unknown');
    return null;
  }
}

export async function GET(request: NextRequest) {
  // Rate limiting - 60 requests per minute (generous for token fetches)
  // This endpoint is only called on page load and token refresh, not for each calendar operation
  const rateLimitError = await rateLimitMiddleware(request, RATE_LIMIT.API.MAX_REQUESTS);
  if (rateLimitError) return rateLimitError;

  // CSRF protection
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;

  // Verify user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED });
  }

  const cookieStore = await cookies();
  let accessToken = cookieStore.get('google_access_token')?.value;
  const refreshToken = cookieStore.get('google_refresh_token')?.value;

  // If no access token but we have a refresh token, try to refresh
  if (!accessToken && refreshToken) {
    const tokenData = await refreshAccessToken(refreshToken);

    if (tokenData) {
      accessToken = tokenData.access_token;

      // Store the new access token with secure settings
      cookieStore.set('google_access_token', accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: tokenData.expires_in || COOKIE_CONFIG.GOOGLE_ACCESS_TOKEN_MAX_AGE,
      });
    }
  }

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Your calendar connection has expired. Please reconnect your Google account.' },
      { status: HTTP_STATUS.NOT_FOUND }
    );
  }

  return NextResponse.json({
    accessToken,
    hasRefreshToken: !!refreshToken,
  });
}
