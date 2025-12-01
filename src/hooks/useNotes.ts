'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { sanitizeHtml, sanitizeText, validateNoteTitle } from '@/lib/validation';
import type { Note } from '@/types';

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Fetch all notes
  const fetchNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setNotes([]);
        return;
      }

      const { data, error: fetchError } = await (supabase
        .from('notes') as any)
        .select('*')
        .order('updated_at', { ascending: false }) as { data: Note[] | null; error: Error | null };

      if (fetchError) throw fetchError;
      setNotes(data || []);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notes');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Create a new note
  const createNote = useCallback(async (title: string, content: string = ''): Promise<Note | null> => {
    try {
      // Validate and sanitize inputs
      const titleValidation = validateNoteTitle(title);
      if (!titleValidation.valid) {
        throw new Error(titleValidation.error);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: insertError } = await (supabase
        .from('notes') as any)
        .insert({
          user_id: user.id,
          title: sanitizeText(title, 255),
          content: sanitizeHtml(content),
        })
        .select()
        .single() as { data: Note | null; error: Error | null };

      if (insertError) throw insertError;
      if (data) {
        setNotes((prev) => [data, ...prev]);
      }
      return data;
    } catch (err) {
      console.error('Failed to create note:', err);
      setError(err instanceof Error ? err.message : 'Failed to create note');
      return null;
    }
  }, [supabase]);

  // Update a note
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

      const { data, error: updateError } = await (supabase
        .from('notes') as any)
        .update(sanitizedUpdates)
        .eq('id', id)
        .select()
        .single() as { data: Note | null; error: Error | null };

      if (updateError) throw updateError;
      if (data) {
        setNotes((prev) => prev.map((n) => (n.id === id ? data : n)));
      }
      return data;
    } catch (err) {
      console.error('Failed to update note:', err);
      setError(err instanceof Error ? err.message : 'Failed to update note');
      return null;
    }
  }, [supabase]);

  // Delete a note
  const deleteNote = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await (supabase
        .from('notes') as any)
        .delete()
        .eq('id', id) as { error: Error | null };

      if (deleteError) throw deleteError;
      setNotes((prev) => prev.filter((n) => n.id !== id));
      return true;
    } catch (err) {
      console.error('Failed to delete note:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete note');
      return false;
    }
  }, [supabase]);

  return {
    notes,
    isLoading,
    error,
    createNote,
    updateNote,
    deleteNote,
    refetch: fetchNotes,
  };
}
