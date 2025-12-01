'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Task, TaskPriority, Database } from '@/types';

export function useTasks(projectId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Fetch tasks for the selected project
  const fetchTasks = useCallback(async () => {
    if (!projectId) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await (supabase
        .from('tasks') as any)
        .select('*')
        .eq('project_id', projectId)
        .order('position', { ascending: true }) as { data: Task[] | null; error: Error | null };

      if (fetchError) throw fetchError;

      setTasks(data || []);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, projectId]);

  // Create a new task
  const createTask = useCallback(async (
    statusId: string,
    title: string,
    options?: {
      description?: string;
      priority?: TaskPriority;
      scheduled_date?: string;
    }
  ) => {
    if (!projectId) throw new Error('No project selected');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get position for new task
      const tasksInStatus = tasks.filter(t => t.status_id === statusId);
      const position = tasksInStatus.length;

      const { data, error } = await (supabase
        .from('tasks') as any)
        .insert({
          user_id: user.id,
          project_id: projectId,
          status_id: statusId,
          title,
          description: options?.description || null,
          priority: options?.priority || 'medium',
          scheduled_date: options?.scheduled_date || null,
          position,
        })
        .select()
        .single() as { data: Task | null; error: Error | null };

      if (error || !data) throw error || new Error('Failed to create task');

      setTasks(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Failed to create task:', err);
      throw err;
    }
  }, [supabase, projectId, tasks]);

  // Update a task
  const updateTask = useCallback(async (
    taskId: string,
    updates: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'scheduled_date' | 'status_id' | 'position'>>
  ) => {
    try {
      const { data, error } = await (supabase
        .from('tasks') as any)
        .update(updates)
        .eq('id', taskId)
        .select()
        .single() as { data: Task | null; error: Error | null };

      if (error || !data) throw error || new Error('Failed to update task');

      setTasks(prev => prev.map(t => t.id === taskId ? data : t));
      return data;
    } catch (err) {
      console.error('Failed to update task:', err);
      throw err;
    }
  }, [supabase]);

  // Delete a task
  const deleteTask = useCallback(async (taskId: string) => {
    try {
      const { error } = await (supabase
        .from('tasks') as any)
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
      throw err;
    }
  }, [supabase]);

  // Move task to different status (for drag and drop)
  const moveTask = useCallback(async (
    taskId: string,
    newStatusId: string,
    newPosition: number
  ) => {
    try {
      // Optimistic update
      setTasks(prev => {
        const task = prev.find(t => t.id === taskId);
        if (!task) return prev;

        // Remove from old position
        const withoutTask = prev.filter(t => t.id !== taskId);

        // Update positions in target status
        const targetTasks = withoutTask
          .filter(t => t.status_id === newStatusId)
          .map((t, idx) => ({
            ...t,
            position: idx >= newPosition ? idx + 1 : idx,
          }));

        // Other tasks stay the same
        const otherTasks = withoutTask.filter(t => t.status_id !== newStatusId);

        // Insert moved task at new position
        const movedTask = { ...task, status_id: newStatusId, position: newPosition };

        return [...otherTasks, ...targetTasks, movedTask].sort((a, b) => {
          if (a.status_id !== b.status_id) return 0;
          return a.position - b.position;
        });
      });

      // Update in database
      const { error } = await (supabase
        .from('tasks') as any)
        .update({ status_id: newStatusId, position: newPosition })
        .eq('id', taskId);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to move task:', err);
      // Refetch on error
      fetchTasks();
      throw err;
    }
  }, [supabase, fetchTasks]);

  // Reorder tasks within a status
  const reorderTasks = useCallback(async (statusId: string, taskIds: string[]) => {
    try {
      // Optimistic update
      setTasks(prev => {
        const statusTasks = prev.filter(t => t.status_id === statusId);
        const otherTasks = prev.filter(t => t.status_id !== statusId);

        const reorderedTasks = taskIds.map((id, index) => {
          const task = statusTasks.find(t => t.id === id);
          return task ? { ...task, position: index } : null;
        }).filter(Boolean) as Task[];

        return [...otherTasks, ...reorderedTasks];
      });

      // Update positions in database
      const updates = taskIds.map((id, index) =>
        (supabase
          .from('tasks') as any)
          .update({ position: index })
          .eq('id', id)
      );

      await Promise.all(updates);
    } catch (err) {
      console.error('Failed to reorder tasks:', err);
      // Refetch on error
      fetchTasks();
      throw err;
    }
  }, [supabase, fetchTasks]);

  // Get tasks grouped by status
  const getTasksByStatus = useCallback((statusId: string) => {
    return tasks
      .filter(t => t.status_id === statusId)
      .sort((a, b) => a.position - b.position);
  }, [tasks]);

  // Initial fetch when project changes
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    reorderTasks,
    getTasksByStatus,
    refetch: fetchTasks,
  };
}
