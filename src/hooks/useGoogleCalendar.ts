'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  type GoogleCalendarEvent,
} from '@/lib/google-calendar';
import { HTTP_STATUS } from '@/lib/constants';

export function useGoogleCalendar() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const getToken = async () => {
      try {
        // First check if there's a provider_token in the session (right after OAuth)
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.provider_token) {
          setAccessToken(session.provider_token);
          setError(null);
          setIsLoading(false);
          return;
        }

        // Otherwise, try to get it from our stored cookie via API
        const response = await fetch('/api/google-token');

        if (response.ok) {
          const data = await response.json();
          if (data.accessToken) {
            setAccessToken(data.accessToken);
            setError(null);
          }
        } else if (response.status === HTTP_STATUS.NOT_FOUND) {
          setError('Calendar sync requires re-authentication. Please sign out and sign in again.');
        } else if (response.status === HTTP_STATUS.UNAUTHORIZED) {
          setError(null); // User not logged in, not an error
        }
      } catch (err) {
        console.error('Token error:', err);
        setError('Failed to get access token');
      } finally {
        setIsLoading(false);
      }
    };

    getToken();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.provider_token) {
        setAccessToken(session.provider_token);
        setError(null);
      }

      // Re-fetch token after sign in
      if (event === 'SIGNED_IN') {
        getToken();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const fetchEvents = useCallback(
    async (timeMin?: Date, timeMax?: Date): Promise<GoogleCalendarEvent[]> => {
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return getCalendarEvents(accessToken, 'primary', timeMin, timeMax);
    },
    [accessToken]
  );

  const addEvent = useCallback(
    async (event: {
      summary: string;
      description?: string;
      start: { dateTime: string; timeZone: string } | { date: string };
      end: { dateTime: string; timeZone: string } | { date: string };
    }): Promise<GoogleCalendarEvent> => {
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return createCalendarEvent(accessToken, event);
    },
    [accessToken]
  );

  const editEvent = useCallback(
    async (
      eventId: string,
      event: {
        summary?: string;
        description?: string;
        start?: { dateTime: string; timeZone: string } | { date: string };
        end?: { dateTime: string; timeZone: string } | { date: string };
      }
    ): Promise<GoogleCalendarEvent> => {
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return updateCalendarEvent(accessToken, eventId, event);
    },
    [accessToken]
  );

  const removeEvent = useCallback(
    async (eventId: string): Promise<void> => {
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return deleteCalendarEvent(accessToken, eventId);
    },
    [accessToken]
  );

  return {
    isConnected: !!accessToken,
    isLoading,
    error,
    fetchEvents,
    addEvent,
    editEvent,
    removeEvent,
  };
}
