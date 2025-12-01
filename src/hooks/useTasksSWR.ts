'use client';

import useSWR, { mutate } from 'swr';
import { useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Task, TaskPriority } from '@/types';

// Generate cache key for tasks by project
const getTasksKey = (projectId: string | null) =>
  projectId ? `tasks-${projectId}` : null;

// Fetcher function
async function fetchTasks(key: string): Promise<Task[]> {
  const projectId = key.replace('tasks-', '');
  const supabase = createClient();

  const { data, error } = await (supabase
    .from('tasks') as any)
    .select('*')
    .eq('project_id', projectId)
    .order('position', { ascending: true }) as { data: Task[] | null; error: Error | null };

  if (error) throw error;
  return data || [];
}

export function useTasksSWR(projectId: string | null) {
  const supabase = createClient();
  const cacheKey = getTasksKey(projectId);

  const { data: tasks = [], error, isLoading, isValidating } = useSWR<Task[]>(
    cacheKey,
    fetchTasks,
    {
      revalidateOnMount: true,
      keepPreviousData: true,
    }
  );

  // Create a new task with optimistic update
  const createTask = useCallback(async (
    statusId: string,
    title: string,
    options?: {
      description?: string;
      priority?: TaskPriority;
      scheduled_date?: string;
    }
  ) => {
    if (!projectId || !cacheKey) throw new Error('No project selected');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Calculate position
    const tasksInStatus = tasks.filter(t => t.status_id === statusId);
    const position = tasksInStatus.length;

    // Create temp task for optimistic update
    const tempId = `temp-${Date.now()}`;
    const tempTask: Task = {
      id: tempId,
      user_id: user.id,
      team_id: null,
      project_id: projectId,
      status_id: statusId,
      title,
      description: options?.description || null,
      priority: options?.priority || 'medium',
      scheduled_date: options?.scheduled_date || null,
      position,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      // Optimistic update
      await mutate(
        cacheKey,
        (current: Task[] | undefined) => [...(current || []), tempTask],
        false
      );

      const { data, error: createError } = await (supabase
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

      if (createError || !data) throw createError || new Error('Failed to create task');

      // Replace temp with real data
      await mutate(
        cacheKey,
        (current: Task[] | undefined) =>
          (current || []).map(t => t.id === tempId ? data : t),
        false
      );

      return data;
    } catch (err) {
      // Revert on error
      await mutate(cacheKey);
      throw err;
    }
  }, [supabase, projectId, cacheKey, tasks]);

  // Update a task with optimistic update
  const updateTask = useCallback(async (
    taskId: string,
    updates: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'scheduled_date' | 'status_id' | 'position'>>
  ) => {
    if (!cacheKey) throw new Error('No project selected');

    try {
      // Optimistic update
      await mutate(
        cacheKey,
        (current: Task[] | undefined) =>
          (current || []).map(t => t.id === taskId ? { ...t, ...updates } : t),
        false
      );

      const { data, error: updateError } = await (supabase
        .from('tasks') as any)
        .update(updates)
        .eq('id', taskId)
        .select()
        .single() as { data: Task | null; error: Error | null };

      if (updateError || !data) throw updateError || new Error('Failed to update task');

      // Update with server data
      await mutate(
        cacheKey,
        (current: Task[] | undefined) =>
          (current || []).map(t => t.id === taskId ? data : t),
        false
      );

      return data;
    } catch (err) {
      await mutate(cacheKey);
      throw err;
    }
  }, [supabase, cacheKey]);

  // Delete a task with optimistic update
  const deleteTask = useCallback(async (taskId: string) => {
    if (!cacheKey) throw new Error('No project selected');
    const previousTasks = tasks;

    try {
      // Optimistic update
      await mutate(
        cacheKey,
        (current: Task[] | undefined) => (current || []).filter(t => t.id !== taskId),
        false
      );

      const { error: deleteError } = await (supabase
        .from('tasks') as any)
        .delete()
        .eq('id', taskId);

      if (deleteError) throw deleteError;
    } catch (err) {
      // Rollback
      await mutate(cacheKey, previousTasks, false);
      throw err;
    }
  }, [supabase, cacheKey, tasks]);

  // Move task to different status (for drag and drop)
  const moveTask = useCallback(async (
    taskId: string,
    newStatusId: string,
    newPosition: number
  ) => {
    if (!cacheKey) throw new Error('No project selected');
    const previousTasks = tasks;

    try {
      // Optimistic update
      await mutate(
        cacheKey,
        (current: Task[] | undefined) => {
          if (!current) return [];
          const task = current.find(t => t.id === taskId);
          if (!task) return current;

          // Remove from old position
          const withoutTask = current.filter(t => t.id !== taskId);

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
        },
        false
      );

      // Update in database
      const { error: moveError } = await (supabase
        .from('tasks') as any)
        .update({ status_id: newStatusId, position: newPosition })
        .eq('id', taskId);

      if (moveError) throw moveError;
    } catch (err) {
      // Rollback
      await mutate(cacheKey, previousTasks, false);
      throw err;
    }
  }, [supabase, cacheKey, tasks]);

  // Reorder tasks within a status
  const reorderTasks = useCallback(async (statusId: string, taskIds: string[]) => {
    if (!cacheKey) throw new Error('No project selected');
    const previousTasks = tasks;

    try {
      // Optimistic update
      await mutate(
        cacheKey,
        (current: Task[] | undefined) => {
          if (!current) return [];
          const statusTasks = current.filter(t => t.status_id === statusId);
          const otherTasks = current.filter(t => t.status_id !== statusId);

          const reorderedTasks = taskIds.map((id, index) => {
            const task = statusTasks.find(t => t.id === id);
            return task ? { ...task, position: index } : null;
          }).filter(Boolean) as Task[];

          return [...otherTasks, ...reorderedTasks];
        },
        false
      );

      // Update positions in database
      const updates = taskIds.map((id, index) =>
        (supabase
          .from('tasks') as any)
          .update({ position: index })
          .eq('id', id)
      );

      await Promise.all(updates);
    } catch (err) {
      // Rollback
      await mutate(cacheKey, previousTasks, false);
      throw err;
    }
  }, [supabase, cacheKey, tasks]);

  // Get tasks grouped by status
  const getTasksByStatus = useCallback((statusId: string) => {
    return tasks
      .filter(t => t.status_id === statusId)
      .sort((a, b) => a.position - b.position);
  }, [tasks]);

  // Manual refetch
  const refetch = useCallback(() => {
    if (cacheKey) {
      return mutate(cacheKey);
    }
  }, [cacheKey]);

  return {
    tasks,
    isLoading: isLoading && !tasks.length,
    isValidating,
    error: error?.message || null,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    reorderTasks,
    getTasksByStatus,
    refetch,
  };
}
