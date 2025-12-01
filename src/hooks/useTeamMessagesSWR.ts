'use client';

import useSWRInfinite from 'swr/infinite';
import { useCallback, useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { TeamMessage } from '@/types';

const PAGE_SIZE = 30;

const getKey = (teamId: string) => (pageIndex: number, previousPageData: TeamMessage[] | null) => {
  // No team ID, don't fetch
  if (!teamId) return null;

  // Reached the end (previous page had less than PAGE_SIZE items)
  if (previousPageData && previousPageData.length < PAGE_SIZE) return null;

  // First page - get the most recent messages
  if (pageIndex === 0) return `team-${teamId}-messages-page-0`;

  // Next pages - we'll use the oldest message from previous page as cursor
  return `team-${teamId}-messages-page-${pageIndex}`;
};

async function fetchMessagesPage(
  teamId: string,
  pageIndex: number,
  oldestMessageDate: string | null
): Promise<TeamMessage[]> {
  const supabase = createClient();

  // First fetch messages
  let query = supabase
    .from('team_messages' as any)
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  // If we have a cursor (oldest message date), get messages before that
  if (oldestMessageDate) {
    query = query.lt('created_at', oldestMessageDate);
  }

  const { data, error } = await query;

  if (error) throw error;

  if (!data || data.length === 0) {
    return [];
  }

  // Get unique user IDs from messages
  const userIds = [...new Set(data.map((msg: any) => msg.user_id))];

  // Fetch profiles for these users
  const { data: profiles } = await supabase
    .from('profiles' as any)
    .select('id, display_name, avatar_url')
    .in('id', userIds);

  // Create a map of user_id -> profile
  const profileMap = new Map<string, any>();
  (profiles || []).forEach((profile: any) => {
    profileMap.set(profile.id, profile);
  });

  // Map the profile data and return in ascending order for display
  const messages = data.map((msg: any) => ({
    ...msg,
    profile: profileMap.get(msg.user_id) || null,
  }));

  return (messages as TeamMessage[]).reverse();
}

export function useTeamMessages(teamId: string | null) {
  const [oldestDates, setOldestDates] = useState<Record<number, string>>({});

  const {
    data: pages,
    error,
    isLoading,
    isValidating,
    size,
    setSize,
    mutate,
  } = useSWRInfinite(
    (pageIndex, previousPageData) => {
      if (!teamId) return null;
      if (previousPageData && previousPageData.length < PAGE_SIZE) return null;
      return `team-${teamId}-messages-page-${pageIndex}`;
    },
    async (key) => {
      if (!teamId) return [];
      const pageIndex = parseInt(key.split('-page-')[1]);
      const oldestDate = pageIndex > 0 ? oldestDates[pageIndex - 1] : null;
      return fetchMessagesPage(teamId, pageIndex, oldestDate);
    },
    {
      revalidateFirstPage: true,
      revalidateOnFocus: false,
      revalidateAll: false,
    }
  );

  // Update oldest dates when pages change
  useEffect(() => {
    if (pages) {
      const newOldestDates: Record<number, string> = {};
      pages.forEach((page, index) => {
        if (page && page.length > 0) {
          // Get the oldest message in this page (first one since we reversed)
          newOldestDates[index] = page[0].created_at;
        }
      });
      setOldestDates(newOldestDates);
    }
  }, [pages]);

  // Flatten all pages into a single array (older messages first)
  const messages = pages ? pages.flat().sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  ) : [];

  // Check if there are more messages to load
  const hasMore = pages ? pages[pages.length - 1]?.length === PAGE_SIZE : false;
  const isLoadingMore = isValidating && size > 1;

  // Load more (older) messages
  const loadMore = useCallback(() => {
    if (!isValidating && hasMore) {
      setSize(size + 1);
    }
  }, [isValidating, hasMore, setSize, size]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!teamId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`team-messages-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_messages',
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          // Optimistically add the new message to the cache
          mutate((currentPages) => {
            if (!currentPages || currentPages.length === 0) return currentPages;

            const newMessage = payload.new as TeamMessage;
            // Check if message already exists (avoid duplicates from own sends)
            const allMessages = currentPages.flat();
            if (allMessages.some(m => m.id === newMessage.id)) {
              return currentPages;
            }

            // Add to the first page (most recent)
            const newFirstPage = [...currentPages[0], newMessage];
            return [newFirstPage, ...currentPages.slice(1)];
          }, { revalidate: false });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'team_messages',
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          // Update the message in cache
          mutate((currentPages) => {
            if (!currentPages) return currentPages;
            const updatedMessage = payload.new as TeamMessage;
            return currentPages.map(page =>
              page.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
            );
          }, { revalidate: false });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'team_messages',
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          // Remove the message from cache
          mutate((currentPages) => {
            if (!currentPages) return currentPages;
            const deletedId = (payload.old as any).id;
            return currentPages.map(page =>
              page.filter(msg => msg.id !== deletedId)
            );
          }, { revalidate: false });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime subscription active for team:', teamId);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, mutate]);

  const sendMessage = useCallback(async (content: string, type: 'text' | 'meet' | 'link' = 'text', metadata?: { meet_link?: string; link_url?: string; link_title?: string }) => {
    if (!teamId) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('team_messages' as any)
      .insert({
        team_id: teamId,
        user_id: user.id,
        content,
        type,
        metadata: metadata || null,
      } as any);

    if (error) throw error;
    mutate();
  }, [teamId, mutate]);

  const editMessage = useCallback(async (messageId: string, content: string) => {
    if (!teamId) return;
    const supabase = createClient() as any;

    const { error } = await supabase
      .from('team_messages')
      .update({ content, edited_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) throw error;
    mutate();
  }, [teamId, mutate]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!teamId) return;
    const supabase = createClient();

    const { error } = await supabase
      .from('team_messages' as any)
      .delete()
      .eq('id', messageId);

    if (error) throw error;
    mutate();
  }, [teamId, mutate]);

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
  };
}
