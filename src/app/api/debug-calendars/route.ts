import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCalendarList } from '@/lib/google-calendar';
import { csrfProtection } from '@/lib/csrf';

export async function GET(request: NextRequest) {
  // Block in production - debug endpoints should not be accessible
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // CSRF protection
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;

  // Verify user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('google_access_token')?.value;

  if (!accessToken) {
    return NextResponse.json({ error: 'No Google token' }, { status: 404 });
  }

  try {
    const calendars = await getCalendarList(accessToken);
    return NextResponse.json(calendars);
  } catch (err) {
    // Don't expose internal error details
    console.error('Debug calendar error:', err);
    return NextResponse.json({ error: 'Failed to fetch calendars' }, { status: 500 });
  }
}
