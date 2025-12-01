'use client';

import useSWR, { mutate } from 'swr';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  type GoogleCalendarEvent,
} from '@/lib/google-calendar';
import { HTTP_STATUS } from '@/lib/constants';

// Generate cache key for calendar events by month
const getCalendarKey = (accessToken: string | null, monthKey: string) =>
  accessToken ? `calendar-${monthKey}` : null;

// Fetcher function for calendar events
async function fetchCalendarEvents(
  key: string,
  accessToken: string,
  timeMin: Date,
  timeMax: Date
): Promise<GoogleCalendarEvent[]> {
  return getCalendarEvents(accessToken, 'primary', timeMin, timeMax);
}

export function useGoogleCalendarSWR(currentMonth: Date, enabled: boolean = true) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isTokenLoading, setIsTokenLoading] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const supabase = createClient();

  // Calculate date range for the current month view
  const monthKey = format(currentMonth, 'yyyy-MM');
  const timeMin = useMemo(() => startOfWeek(startOfMonth(currentMonth)), [currentMonth]);
  const timeMax = useMemo(() => endOfWeek(endOfMonth(currentMonth)), [currentMonth]);

  // Get access token (only when enabled)
  useEffect(() => {
    if (!enabled) {
      setIsTokenLoading(false);
      setAccessToken(null);
      setTokenError(null);
      return;
    }

    const getToken = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.provider_token) {
          setAccessToken(session.provider_token);
          setTokenError(null);
          setIsTokenLoading(false);
          return;
        }

        const response = await fetch('/api/google-token');

        if (response.ok) {
          const data = await response.json();
          if (data.accessToken) {
            setAccessToken(data.accessToken);
            setTokenError(null);
          }
        } else if (response.status === HTTP_STATUS.NOT_FOUND) {
          setTokenError('Calendar sync requires re-authentication. Please sign out and sign in again.');
        } else if (response.status === HTTP_STATUS.UNAUTHORIZED) {
          setTokenError(null);
        }
      } catch (err) {
        console.error('Token error:', err);
        setTokenError('Failed to get access token');
      } finally {
        setIsTokenLoading(false);
      }
    };

    getToken();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.provider_token) {
        setAccessToken(session.provider_token);
        setTokenError(null);
      }

      if (event === 'SIGNED_IN') {
        getToken();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, enabled]);

  // Cache key for SWR
  const cacheKey = getCalendarKey(accessToken, monthKey);

  // Fetch events with SWR
  const { data: events = [], error: fetchError, isLoading: isFetching, isValidating } = useSWR<GoogleCalendarEvent[]>(
    cacheKey,
    async (key) => {
      if (!accessToken) return [];
      return fetchCalendarEvents(key, accessToken, timeMin, timeMax);
    },
    {
      revalidateOnMount: true,
      keepPreviousData: true,
      // Calendar events don't change as often, cache longer
      dedupingInterval: 30000, // 30 seconds
    }
  );

  // Add event with optimistic update
  const addEvent = useCallback(
    async (event: {
      summary: string;
      description?: string;
      start: { dateTime: string; timeZone: string } | { date: string };
      end: { dateTime: string; timeZone: string } | { date: string };
    }): Promise<GoogleCalendarEvent> => {
      if (!accessToken || !cacheKey) {
        throw new Error('No access token available');
      }

      // Create temp event for optimistic update
      const tempId = `temp-${Date.now()}`;
      const tempEvent: GoogleCalendarEvent = {
        id: tempId,
        summary: event.summary,
        description: event.description,
        start: event.start,
        end: event.end,
      };

      try {
        // Optimistic update
        await mutate(
          cacheKey,
          (current: GoogleCalendarEvent[] | undefined) => [...(current || []), tempEvent],
          false
        );

        const newEvent = await createCalendarEvent(accessToken, event);

        // Replace temp with real event
        await mutate(
          cacheKey,
          (current: GoogleCalendarEvent[] | undefined) =>
            (current || []).map(e => e.id === tempId ? newEvent : e),
          false
        );

        return newEvent;
      } catch (err) {
        // Rollback on error
        await mutate(cacheKey);
        throw err;
      }
    },
    [accessToken, cacheKey]
  );

  // Edit event with optimistic update
  const editEvent = useCallback(
    async (
      eventId: string,
      eventUpdates: {
        summary?: string;
        description?: string;
        start?: { dateTime: string; timeZone: string } | { date: string };
        end?: { dateTime: string; timeZone: string } | { date: string };
      }
    ): Promise<GoogleCalendarEvent> => {
      if (!accessToken || !cacheKey) {
        throw new Error('No access token available');
      }

      const previousEvents = events;

      try {
        // Optimistic update
        await mutate(
          cacheKey,
          (current: GoogleCalendarEvent[] | undefined) =>
            (current || []).map(e =>
              e.id === eventId ? { ...e, ...eventUpdates } : e
            ),
          false
        );

        const updatedEvent = await updateCalendarEvent(accessToken, eventId, eventUpdates);

        // Update with server response
        await mutate(
          cacheKey,
          (current: GoogleCalendarEvent[] | undefined) =>
            (current || []).map(e => e.id === eventId ? updatedEvent : e),
          false
        );

        return updatedEvent;
      } catch (err) {
        // Rollback on error
        await mutate(cacheKey, previousEvents, false);
        throw err;
      }
    },
    [accessToken, cacheKey, events]
  );

  // Remove event with optimistic update
  const removeEvent = useCallback(
    async (eventId: string): Promise<void> => {
      if (!accessToken || !cacheKey) {
        throw new Error('No access token available');
      }

      const previousEvents = events;

      try {
        // Optimistic update - remove immediately
        await mutate(
          cacheKey,
          (current: GoogleCalendarEvent[] | undefined) =>
            (current || []).filter(e => e.id !== eventId),
          false
        );

        await deleteCalendarEvent(accessToken, eventId);
      } catch (err) {
        // Rollback on error
        await mutate(cacheKey, previousEvents, false);
        throw err;
      }
    },
    [accessToken, cacheKey, events]
  );

  // Manual refetch
  const refetch = useCallback(() => {
    if (cacheKey) {
      return mutate(cacheKey);
    }
  }, [cacheKey]);

  // Prefetch adjacent months
  const prefetchMonth = useCallback(
    async (month: Date) => {
      if (!accessToken) return;

      const prefetchMonthKey = format(month, 'yyyy-MM');
      const prefetchCacheKey = getCalendarKey(accessToken, prefetchMonthKey);

      if (!prefetchCacheKey) return;

      const prefetchTimeMin = startOfWeek(startOfMonth(month));
      const prefetchTimeMax = endOfWeek(endOfMonth(month));

      // Prefetch in background
      mutate(
        prefetchCacheKey,
        () => fetchCalendarEvents(prefetchCacheKey, accessToken, prefetchTimeMin, prefetchTimeMax),
        false
      );
    },
    [accessToken]
  );

  return {
    events,
    isConnected: !!accessToken,
    isLoading: isTokenLoading || (isFetching && !events.length),
    isValidating,
    error: tokenError || (fetchError?.message ?? null),
    addEvent,
    editEvent,
    removeEvent,
    refetch,
    prefetchMonth,
  };
}
