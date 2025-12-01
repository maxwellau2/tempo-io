'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import type { TeamEvent } from '@/types';

const getEventsKey = (teamId: string | null, monthKey: string) =>
  teamId ? `team-events-${teamId}-${monthKey}` : null;

async function fetchTeamEvents(
  teamId: string,
  timeMin: Date,
  timeMax: Date
): Promise<TeamEvent[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('team_events' as any)
    .select('*, profiles(id, display_name, avatar_url)')
    .eq('team_id', teamId)
    .gte('start_time', timeMin.toISOString())
    .lte('start_time', timeMax.toISOString())
    .order('start_time', { ascending: true });

  if (error) throw error;

  return (data || []).map((e: any) => ({
    ...e,
    profile: e.profiles,
  }));
}

export function useTeamCalendarSWR(teamId: string | null, currentMonth: Date) {
  const monthKey = format(currentMonth, 'yyyy-MM');
  const timeMin = startOfWeek(startOfMonth(currentMonth));
  const timeMax = endOfWeek(endOfMonth(currentMonth));
  const cacheKey = getEventsKey(teamId, monthKey);

  const { data: events = [], error, isLoading, isValidating } = useSWR<TeamEvent[]>(
    cacheKey,
    () => teamId ? fetchTeamEvents(teamId, timeMin, timeMax) : [],
    {
      revalidateOnMount: true,
      keepPreviousData: true,
    }
  );

  const addEvent = useCallback(async (event: {
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    is_all_day: boolean;
    color?: string;
  }): Promise<TeamEvent> => {
    if (!teamId || !cacheKey) throw new Error('No team selected');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const tempId = `temp-${Date.now()}`;
    const tempEvent: TeamEvent = {
      id: tempId,
      team_id: teamId,
      user_id: user.id,
      title: event.title,
      description: event.description || null,
      start_time: event.start_time,
      end_time: event.end_time,
      is_all_day: event.is_all_day,
      color: event.color || 'bg-blue-500',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await mutate(
        cacheKey,
        (current: TeamEvent[] | undefined) => [...(current || []), tempEvent],
        false
      );

      const { data, error: insertError } = await supabase
        .from('team_events' as any)
        .insert({
          team_id: teamId,
          user_id: user.id,
          title: event.title,
          description: event.description || null,
          start_time: event.start_time,
          end_time: event.end_time,
          is_all_day: event.is_all_day,
          color: event.color || 'bg-blue-500',
        } as any)
        .select()
        .single();

      if (insertError) throw insertError;

      await mutate(
        cacheKey,
        (current: TeamEvent[] | undefined) =>
          (current || []).map(e => e.id === tempId ? (data as TeamEvent) : e),
        false
      );

      return data as TeamEvent;
    } catch (err) {
      await mutate(cacheKey);
      throw err;
    }
  }, [teamId, cacheKey]);

  const editEvent = useCallback(async (
    eventId: string,
    updates: Partial<Pick<TeamEvent, 'title' | 'description' | 'start_time' | 'end_time' | 'is_all_day' | 'color'>>
  ): Promise<TeamEvent> => {
    if (!cacheKey) throw new Error('No team selected');

    const supabase = createClient();
    const previousEvents = events;

    try {
      await mutate(
        cacheKey,
        (current: TeamEvent[] | undefined) =>
          (current || []).map(e => e.id === eventId ? { ...e, ...updates, updated_at: new Date().toISOString() } : e),
        false
      );

      const { data, error: updateError } = await (supabase as any)
        .from('team_events')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', eventId)
        .select()
        .single();

      if (updateError) throw updateError;

      await mutate(
        cacheKey,
        (current: TeamEvent[] | undefined) =>
          (current || []).map(e => e.id === eventId ? (data as TeamEvent) : e),
        false
      );

      return data as TeamEvent;
    } catch (err) {
      await mutate(cacheKey, previousEvents, false);
      throw err;
    }
  }, [cacheKey, events]);

  const removeEvent = useCallback(async (eventId: string): Promise<void> => {
    if (!cacheKey) throw new Error('No team selected');

    const supabase = createClient();
    const previousEvents = events;

    try {
      await mutate(
        cacheKey,
        (current: TeamEvent[] | undefined) => (current || []).filter(e => e.id !== eventId),
        false
      );

      const { error: deleteError } = await supabase
        .from('team_events' as any)
        .delete()
        .eq('id', eventId);

      if (deleteError) throw deleteError;
    } catch (err) {
      await mutate(cacheKey, previousEvents, false);
      throw err;
    }
  }, [cacheKey, events]);

  const refetch = useCallback(() => {
    if (cacheKey) {
      return mutate(cacheKey);
    }
  }, [cacheKey]);

  return {
    events,
    isLoading,
    isValidating,
    error: error?.message || null,
    addEvent,
    editEvent,
    removeEvent,
    refetch,
  };
}
