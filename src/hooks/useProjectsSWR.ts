'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTeamStore } from '@/stores/teamStore';
import type { Project, ProjectStatus } from '@/types';
import { DEFAULT_STATUSES, PROJECT_COLORS } from '@/lib/constants';

const getProjectsKey = (mode: 'personal' | 'team', teamId: string | null) =>
  mode === 'team' && teamId ? `projects-team-${teamId}` : 'projects-personal';
const STATUSES_KEY = 'project-statuses';

// Fetcher for projects
async function fetchProjects(mode: 'personal' | 'team', teamId: string | null): Promise<Project[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  let query = (supabase.from('projects') as any).select('*');

  if (mode === 'team' && teamId) {
    query = query.eq('team_id', teamId);
  } else {
    query = query.is('team_id', null).eq('user_id', user.id);
  }

  const { data, error } = await query.order('position', { ascending: true }) as { data: Project[] | null; error: Error | null };

  if (error) throw error;
  return data || [];
}

// Fetcher for statuses
async function fetchStatuses(projectIds: string[]): Promise<Record<string, ProjectStatus[]>> {
  if (projectIds.length === 0) return {};

  const supabase = createClient();
  const { data, error } = await (supabase
    .from('project_statuses') as any)
    .select('*')
    .in('project_id', projectIds)
    .order('position', { ascending: true }) as { data: ProjectStatus[] | null; error: Error | null };

  if (error) throw error;

  // Group by project_id
  const statusesByProject: Record<string, ProjectStatus[]> = {};
  (data || []).forEach(status => {
    if (!statusesByProject[status.project_id]) {
      statusesByProject[status.project_id] = [];
    }
    statusesByProject[status.project_id].push(status);
  });

  return statusesByProject;
}

export function useProjectsSWR() {
  const supabase = createClient();
  const { mode, activeTeamId } = useTeamStore();
  const projectsKey = getProjectsKey(mode, activeTeamId);

  // Fetch projects with SWR
  const {
    data: projects = [],
    error: projectsError,
    isLoading: projectsLoading,
  } = useSWR<Project[]>(projectsKey, () => fetchProjects(mode, activeTeamId), {
    revalidateOnMount: true,
    keepPreviousData: true,
  });

  // Fetch statuses with SWR (depends on projects)
  const projectIds = projects.map(p => p.id);
  const {
    data: statuses = {},
    error: statusesError,
    isLoading: statusesLoading,
  } = useSWR<Record<string, ProjectStatus[]>>(
    projectIds.length > 0 ? [STATUSES_KEY, ...projectIds] : null,
    () => fetchStatuses(projectIds),
    {
      revalidateOnMount: true,
      keepPreviousData: true,
    }
  );

  // Create a new project with default statuses
  const createProject = useCallback(async (name: string, color?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const projectColor = color || PROJECT_COLORS[projects.length % PROJECT_COLORS.length];
    const teamId = mode === 'team' ? activeTeamId : null;

    // Create temp project for optimistic update
    const tempId = `temp-${Date.now()}`;
    const tempProject: Project = {
      id: tempId,
      user_id: user.id,
      team_id: teamId,
      name,
      color: projectColor,
      position: projects.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      // Optimistic update
      await mutate(projectsKey, [...projects, tempProject], false);

      // Create project
      const { data: project, error: projectError } = await (supabase
        .from('projects') as any)
        .insert({
          user_id: user.id,
          team_id: teamId,
          name,
          color: projectColor,
          position: projects.length,
        })
        .select()
        .single() as { data: Project | null; error: Error | null };

      if (projectError || !project) throw projectError || new Error('Failed to create project');

      // Create default statuses
      const statusInserts = DEFAULT_STATUSES.map(status => ({
        project_id: project.id,
        ...status,
      }));

      const { data: newStatuses, error: statusError } = await (supabase
        .from('project_statuses') as any)
        .insert(statusInserts)
        .select() as { data: ProjectStatus[] | null; error: Error | null };

      if (statusError) throw statusError;

      // Update with real data
      await mutate(
        projectsKey,
        (current: Project[] | undefined) =>
          (current || []).map(p => p.id === tempId ? project : p),
        false
      );

      // Update statuses cache
      await mutate(
        [STATUSES_KEY, ...projectIds, project.id],
        { ...statuses, [project.id]: newStatuses || [] },
        false
      );

      return project;
    } catch (err) {
      // Rollback on error
      await mutate(projectsKey);
      throw err;
    }
  }, [supabase, projects, projectIds, statuses, projectsKey, mode, activeTeamId]);

  // Update project
  const updateProject = useCallback(async (id: string, updates: Partial<Pick<Project, 'name' | 'color' | 'position'>>) => {
    const previousProjects = projects;

    try {
      // Optimistic update
      await mutate(
        projectsKey,
        projects.map(p => p.id === id ? { ...p, ...updates } : p),
        false
      );

      const { data, error } = await (supabase
        .from('projects') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single() as { data: Project | null; error: Error | null };

      if (error || !data) throw error || new Error('Failed to update project');

      // Update with server data
      await mutate(
        projectsKey,
        (current: Project[] | undefined) =>
          (current || []).map(p => p.id === id ? data : p),
        false
      );

      return data;
    } catch (err) {
      await mutate(projectsKey, previousProjects, false);
      throw err;
    }
  }, [supabase, projects, projectsKey]);

  // Delete project
  const deleteProject = useCallback(async (id: string) => {
    const previousProjects = projects;
    const previousStatuses = statuses;

    try {
      // Optimistic update
      await mutate(projectsKey, projects.filter(p => p.id !== id), false);

      const { error } = await (supabase
        .from('projects') as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remove statuses for this project from cache
      const newStatuses = { ...statuses };
      delete newStatuses[id];
      await mutate([STATUSES_KEY, ...projectIds.filter(pid => pid !== id)], newStatuses, false);
    } catch (err) {
      await mutate(projectsKey, previousProjects, false);
      await mutate([STATUSES_KEY, ...projectIds], previousStatuses, false);
      throw err;
    }
  }, [supabase, projects, statuses, projectIds, projectsKey]);

  // Add status to project
  const addStatus = useCallback(async (projectId: string, name: string, icon: string = '📋', color: string = 'bg-gray-100 dark:bg-gray-800') => {
    const currentStatuses = statuses[projectId] || [];
    const position = currentStatuses.length;

    const tempId = `temp-${Date.now()}`;
    const tempStatus: ProjectStatus = {
      id: tempId,
      project_id: projectId,
      name,
      icon,
      color,
      position,
      created_at: new Date().toISOString(),
    };

    try {
      // Optimistic update
      const newStatuses = {
        ...statuses,
        [projectId]: [...currentStatuses, tempStatus],
      };
      await mutate([STATUSES_KEY, ...projectIds], newStatuses, false);

      const { data, error } = await (supabase
        .from('project_statuses') as any)
        .insert({
          project_id: projectId,
          name,
          icon,
          color,
          position,
        })
        .select()
        .single() as { data: ProjectStatus | null; error: Error | null };

      if (error || !data) throw error || new Error('Failed to add status');

      // Replace temp with real data
      await mutate(
        [STATUSES_KEY, ...projectIds],
        (current: Record<string, ProjectStatus[]> | undefined) => ({
          ...current,
          [projectId]: (current?.[projectId] || []).map(s => s.id === tempId ? data : s),
        }),
        false
      );

      return data;
    } catch (err) {
      await mutate([STATUSES_KEY, ...projectIds]);
      throw err;
    }
  }, [supabase, statuses, projectIds]);

  // Update status
  const updateStatus = useCallback(async (statusId: string, projectId: string, updates: Partial<Pick<ProjectStatus, 'name' | 'icon' | 'color' | 'position'>>) => {
    const previousStatuses = statuses;

    try {
      // Optimistic update
      await mutate(
        [STATUSES_KEY, ...projectIds],
        {
          ...statuses,
          [projectId]: (statuses[projectId] || []).map(s =>
            s.id === statusId ? { ...s, ...updates } : s
          ),
        },
        false
      );

      const { data, error } = await (supabase
        .from('project_statuses') as any)
        .update(updates)
        .eq('id', statusId)
        .select()
        .single() as { data: ProjectStatus | null; error: Error | null };

      if (error || !data) throw error || new Error('Failed to update status');

      // Update with server data
      await mutate(
        [STATUSES_KEY, ...projectIds],
        (current: Record<string, ProjectStatus[]> | undefined) => ({
          ...current,
          [projectId]: (current?.[projectId] || []).map(s => s.id === statusId ? data : s),
        }),
        false
      );

      return data;
    } catch (err) {
      await mutate([STATUSES_KEY, ...projectIds], previousStatuses, false);
      throw err;
    }
  }, [supabase, statuses, projectIds]);

  // Delete status
  const deleteStatus = useCallback(async (statusId: string, projectId: string) => {
    const previousStatuses = statuses;

    try {
      // Optimistic update
      await mutate(
        [STATUSES_KEY, ...projectIds],
        {
          ...statuses,
          [projectId]: (statuses[projectId] || []).filter(s => s.id !== statusId),
        },
        false
      );

      const { error } = await (supabase
        .from('project_statuses') as any)
        .delete()
        .eq('id', statusId);

      if (error) throw error;
    } catch (err) {
      await mutate([STATUSES_KEY, ...projectIds], previousStatuses, false);
      throw err;
    }
  }, [supabase, statuses, projectIds]);

  // Reorder statuses
  const reorderStatuses = useCallback(async (projectId: string, statusIds: string[]) => {
    const previousStatuses = statuses;
    const currentStatuses = statuses[projectId] || [];

    try {
      // Optimistic update
      const reorderedStatuses = statusIds.map((id, index) => {
        const status = currentStatuses.find(s => s.id === id);
        return status ? { ...status, position: index } : null;
      }).filter(Boolean) as ProjectStatus[];

      await mutate(
        [STATUSES_KEY, ...projectIds],
        { ...statuses, [projectId]: reorderedStatuses },
        false
      );

      // Update in database
      const updates = statusIds.map((id, index) =>
        (supabase
          .from('project_statuses') as any)
          .update({ position: index })
          .eq('id', id)
      );

      await Promise.all(updates);
    } catch (err) {
      await mutate([STATUSES_KEY, ...projectIds], previousStatuses, false);
      throw err;
    }
  }, [supabase, statuses, projectIds]);

  // Manual refetch
  const refetch = useCallback(() => {
    mutate(projectsKey);
    if (projectIds.length > 0) {
      mutate([STATUSES_KEY, ...projectIds]);
    }
  }, [projectIds, projectsKey]);

  return {
    projects,
    statuses,
    isLoading: (projectsLoading && !projects.length) || (statusesLoading && !Object.keys(statuses).length),
    error: projectsError?.message || statusesError?.message || null,
    createProject,
    updateProject,
    deleteProject,
    addStatus,
    updateStatus,
    deleteStatus,
    reorderStatuses,
    refetch,
    PROJECT_COLORS,
  };
}
