'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { sanitizeHtml, sanitizeText, validateNoteTitle } from '@/lib/validation';
import type { Note } from '@/types';

const NOTES_KEY = 'notes';

// Fetcher function for SWR
async function fetchNotes(): Promise<Note[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await (supabase
    .from('notes') as any)
    .select('*')
    .order('updated_at', { ascending: false }) as { data: Note[] | null; error: Error | null };

  if (error) throw error;
  return data || [];
}

export function useNotesSWR() {
  const supabase = createClient();

  const { data: notes = [], error, isLoading, isValidating } = useSWR<Note[]>(
    NOTES_KEY,
    fetchNotes,
    {
      // Keep the data fresh but show cached immediately
      revalidateOnMount: true,
      // Don't show loading spinner when we have cached data
      keepPreviousData: true,
    }
  );

  // Create a new note with optimistic update
  const createNote = useCallback(async (title: string, content: string = ''): Promise<Note | null> => {
    try {
      // Validate inputs
      const titleValidation = validateNoteTitle(title);
      if (!titleValidation.valid) {
        throw new Error(titleValidation.error);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const sanitizedTitle = sanitizeText(title, 255);
      const sanitizedContent = sanitizeHtml(content);

      // Optimistic update - add temp note immediately
      const tempId = `temp-${Date.now()}`;
      const tempNote: Note = {
        id: tempId,
        user_id: user.id,
        title: sanitizedTitle,
        content: sanitizedContent,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Update cache optimistically
      await mutate(
        NOTES_KEY,
        (current: Note[] | undefined) => [tempNote, ...(current || [])],
        false // Don't revalidate yet
      );

      // Actual API call
      const { data, error: insertError } = await (supabase
        .from('notes') as any)
        .insert({
          user_id: user.id,
          title: sanitizedTitle,
          content: sanitizedContent,
        })
        .select()
        .single() as { data: Note | null; error: Error | null };

      if (insertError) throw insertError;

      // Replace temp note with real note
      if (data) {
        await mutate(
          NOTES_KEY,
          (current: Note[] | undefined) =>
            (current || []).map(n => n.id === tempId ? data : n),
          false
        );
      }

      return data;
    } catch (err) {
      // Revert optimistic update on error
      await mutate(NOTES_KEY);
      console.error('Failed to create note:', err);
      throw err;
    }
  }, [supabase]);

  // Update a note with optimistic update
  const updateNote = useCallback(async (id: string, updates: { title?: string; content?: string }): Promise<Note | null> => {
    try {
      // Sanitize inputs
      const sanitizedUpdates: { title?: string; content?: string; updated_at: string } = {
        updated_at: new Date().toISOString(),
      };

      if (updates.title !== undefined) {
        const titleValidation = validateNoteTitle(updates.title);
        if (!titleValidation.valid) {
          throw new Error(titleValidation.error);
        }
        sanitizedUpdates.title = sanitizeText(updates.title, 255);
      }

      if (updates.content !== undefined) {
        sanitizedUpdates.content = sanitizeHtml(updates.content);
      }

      // Optimistic update
      await mutate(
        NOTES_KEY,
        (current: Note[] | undefined) =>
          (current || []).map(n => n.id === id ? { ...n, ...sanitizedUpdates } : n),
        false
      );

      const { data, error: updateError } = await (supabase
        .from('notes') as any)
        .update(sanitizedUpdates)
        .eq('id', id)
        .select()
        .single() as { data: Note | null; error: Error | null };

      if (updateError) throw updateError;

      // Update with actual server data
      if (data) {
        await mutate(
          NOTES_KEY,
          (current: Note[] | undefined) =>
            (current || []).map(n => n.id === id ? data : n),
          false
        );
      }

      return data;
    } catch (err) {
      // Revert on error
      await mutate(NOTES_KEY);
      console.error('Failed to update note:', err);
      throw err;
    }
  }, [supabase]);

  // Delete a note with optimistic update
  const deleteNote = useCallback(async (id: string): Promise<boolean> => {
    // Store current state for rollback
    const previousNotes = notes;

    try {
      // Optimistic update - remove immediately
      await mutate(
        NOTES_KEY,
        (current: Note[] | undefined) => (current || []).filter(n => n.id !== id),
        false
      );

      const { error: deleteError } = await (supabase
        .from('notes') as any)
        .delete()
        .eq('id', id) as { error: Error | null };

      if (deleteError) throw deleteError;
      return true;
    } catch (err) {
      // Rollback on error
      await mutate(NOTES_KEY, previousNotes, false);
      console.error('Failed to delete note:', err);
      throw err;
    }
  }, [supabase, notes]);

  // Manual refetch
  const refetch = useCallback(() => {
    return mutate(NOTES_KEY);
  }, []);

  return {
    notes,
    isLoading: isLoading && !notes.length,
    isValidating,
    error: error?.message || null,
    createNote,
    updateNote,
    deleteNote,
    refetch,
  };
}
