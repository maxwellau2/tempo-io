import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_CONFIG, ALLOWED_REDIRECT_PATHS } from '@/lib/constants';

// Secure cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // HTTPS in production, HTTP allowed in dev
  sameSite: 'lax' as const, // Lax allows the cookie to be sent on OAuth redirects
  path: '/',
};

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/timer';

  // Validate redirect path to prevent open redirect
  const safePath = (ALLOWED_REDIRECT_PATHS as readonly string[]).includes(next) ? next : '/timer';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      // Store the provider token in a cookie so we can use it for Google Calendar
      // This is needed because Supabase doesn't persist provider_token after initial login
      if (data.session.provider_token) {
        const cookieStore = await cookies();
        cookieStore.set('google_access_token', data.session.provider_token, {
          ...COOKIE_OPTIONS,
          maxAge: COOKIE_CONFIG.GOOGLE_ACCESS_TOKEN_MAX_AGE,
        });

        // Store refresh token if available
        if (data.session.provider_refresh_token) {
          cookieStore.set('google_refresh_token', data.session.provider_refresh_token, {
            ...COOKIE_OPTIONS,
            maxAge: COOKIE_CONFIG.GOOGLE_REFRESH_TOKEN_MAX_AGE,
          });
        }
      }

      return NextResponse.redirect(`${origin}${safePath}`);
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
