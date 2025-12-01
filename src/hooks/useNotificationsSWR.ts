'use client';

import useSWR, { mutate } from 'swr';
import { useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Notification } from '@/types';

const NOTIFICATIONS_KEY = 'notifications';

async function fetchNotifications(): Promise<Notification[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications' as any)
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data || []) as Notification[];
}

export function useNotifications() {
  const { data: notifications = [], error, isLoading } = useSWR(NOTIFICATIONS_KEY, fetchNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const supabase = createClient();

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            mutate(NOTIFICATIONS_KEY);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    const supabase = createClient() as any;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
    mutate(NOTIFICATIONS_KEY);
  }, []);

  const markAllAsRead = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await (supabase as any)
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) throw error;
    mutate(NOTIFICATIONS_KEY);
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    const supabase = createClient();

    const { error } = await supabase
      .from('notifications' as any)
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
    mutate(NOTIFICATIONS_KEY);
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
