'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Project, ProjectStatus, Database } from '@/types';
import { DEFAULT_STATUSES, PROJECT_COLORS } from '@/lib/constants';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [statuses, setStatuses] = useState<Record<string, ProjectStatus[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Fetch all projects and their statuses
  const fetchProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProjects([]);
        setStatuses({});
        return;
      }

      // Fetch projects
      const { data: projectsData, error: projectsError } = await (supabase
        .from('projects') as any)
        .select('*')
        .order('position', { ascending: true }) as { data: Project[] | null; error: Error | null };

      if (projectsError) throw projectsError;

      setProjects(projectsData || []);

      // Fetch all statuses for these projects
      if (projectsData && projectsData.length > 0) {
        const projectIds = projectsData.map(p => p.id);
        const { data: statusesData, error: statusesError } = await (supabase
          .from('project_statuses') as any)
          .select('*')
          .in('project_id', projectIds)
          .order('position', { ascending: true }) as { data: ProjectStatus[] | null; error: Error | null };

        if (statusesError) throw statusesError;

        // Group statuses by project_id
        const statusesByProject: Record<string, ProjectStatus[]> = {};
        (statusesData || []).forEach(status => {
          if (!statusesByProject[status.project_id]) {
            statusesByProject[status.project_id] = [];
          }
          statusesByProject[status.project_id].push(status);
        });
        setStatuses(statusesByProject);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Create a new project with default statuses
  const createProject = useCallback(async (name: string, color?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const projectColor = color || PROJECT_COLORS[projects.length % PROJECT_COLORS.length];

      // Create project
      const { data: project, error: projectError } = await (supabase
        .from('projects') as any)
        .insert({
          user_id: user.id,
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

      // Update local state
      setProjects(prev => [...prev, project]);
      setStatuses(prev => ({
        ...prev,
        [project.id]: newStatuses || [],
      }));

      return project;
    } catch (err) {
      console.error('Failed to create project:', err);
      throw err;
    }
  }, [supabase, projects.length]);

  // Update project
  const updateProject = useCallback(async (id: string, updates: Partial<Pick<Project, 'name' | 'color' | 'position'>>) => {
    try {
      const { data, error } = await (supabase
        .from('projects') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single() as { data: Project | null; error: Error | null };

      if (error || !data) throw error || new Error('Failed to update project');

      setProjects(prev => prev.map(p => p.id === id ? data : p));
      return data;
    } catch (err) {
      console.error('Failed to update project:', err);
      throw err;
    }
  }, [supabase]);

  // Delete project
  const deleteProject = useCallback(async (id: string) => {
    try {
      const { error } = await (supabase
        .from('projects') as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProjects(prev => prev.filter(p => p.id !== id));
      setStatuses(prev => {
        const newStatuses = { ...prev };
        delete newStatuses[id];
        return newStatuses;
      });
    } catch (err) {
      console.error('Failed to delete project:', err);
      throw err;
    }
  }, [supabase]);

  // Add status to project
  const addStatus = useCallback(async (projectId: string, name: string, icon: string = '📋', color: string = 'bg-gray-100 dark:bg-gray-800') => {
    try {
      const currentStatuses = statuses[projectId] || [];
      const position = currentStatuses.length;

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

      setStatuses(prev => ({
        ...prev,
        [projectId]: [...(prev[projectId] || []), data],
      }));

      return data;
    } catch (err) {
      console.error('Failed to add status:', err);
      throw err;
    }
  }, [supabase, statuses]);

  // Update status
  const updateStatus = useCallback(async (statusId: string, projectId: string, updates: Partial<Pick<ProjectStatus, 'name' | 'icon' | 'color' | 'position'>>) => {
    try {
      const { data, error } = await (supabase
        .from('project_statuses') as any)
        .update(updates)
        .eq('id', statusId)
        .select()
        .single() as { data: ProjectStatus | null; error: Error | null };

      if (error || !data) throw error || new Error('Failed to update status');

      setStatuses(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).map(s => s.id === statusId ? data : s),
      }));

      return data;
    } catch (err) {
      console.error('Failed to update status:', err);
      throw err;
    }
  }, [supabase]);

  // Delete status
  const deleteStatus = useCallback(async (statusId: string, projectId: string) => {
    try {
      const { error } = await (supabase
        .from('project_statuses') as any)
        .delete()
        .eq('id', statusId);

      if (error) throw error;

      setStatuses(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).filter(s => s.id !== statusId),
      }));
    } catch (err) {
      console.error('Failed to delete status:', err);
      throw err;
    }
  }, [supabase]);

  // Reorder statuses
  const reorderStatuses = useCallback(async (projectId: string, statusIds: string[]) => {
    try {
      // Optimistic update
      const currentStatuses = statuses[projectId] || [];
      const reorderedStatuses = statusIds.map((id, index) => {
        const status = currentStatuses.find(s => s.id === id);
        return status ? { ...status, position: index } : null;
      }).filter(Boolean) as ProjectStatus[];

      setStatuses(prev => ({
        ...prev,
        [projectId]: reorderedStatuses,
      }));

      // Update in database
      const updates = statusIds.map((id, index) =>
        (supabase
          .from('project_statuses') as any)
          .update({ position: index })
          .eq('id', id)
      );

      await Promise.all(updates);
    } catch (err) {
      console.error('Failed to reorder statuses:', err);
      // Refetch on error
      fetchProjects();
      throw err;
    }
  }, [supabase, statuses, fetchProjects]);

  // Initial fetch
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    statuses,
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject,
    addStatus,
    updateStatus,
    deleteStatus,
    reorderStatuses,
    refetch: fetchProjects,
    PROJECT_COLORS,
  };
}
