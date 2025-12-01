'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button, Input, Modal } from '@/components/ui';
import type { Project } from '@/types';

interface ProjectSidebarProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onCreateProject: (name: string, color?: string) => Promise<Project>;
  onOpenSettings: (project: Project) => void;
  isOpen: boolean;
  onToggle: () => void;
  projectColors: readonly string[];
  openCreateModal?: boolean;
  onCreateModalChange?: (open: boolean) => void;
}

export function ProjectSidebar({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onOpenSettings,
  isOpen,
  onToggle,
  projectColors,
  openCreateModal,
  onCreateModalChange,
}: ProjectSidebarProps) {
  const [internalShowModal, setInternalShowModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(projectColors[0]);
  const [isCreating, setIsCreating] = useState(false);

  // Use external control if provided, otherwise internal state
  const showCreateModal = openCreateModal ?? internalShowModal;
  const setShowCreateModal = (open: boolean) => {
    if (onCreateModalChange) {
      onCreateModalChange(open);
    } else {
      setInternalShowModal(open);
    }
  };

  const handleCreate = async () => {
    if (!newProjectName.trim()) return;

    try {
      setIsCreating(true);
      await onCreateProject(newProjectName.trim(), newProjectColor);
      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectColor(projectColors[0]);
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out',
          'md:transform-none md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'pt-16 md:pt-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Projects</h2>
          </div>

          {/* Project list */}
          <div className="flex-1 overflow-y-auto p-2">
            {projects.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                No projects yet
              </p>
            ) : (
              <ul className="space-y-1">
                {projects.map((project) => (
                  <li key={project.id}>
                    <div
                      onClick={() => {
                        onSelectProject(project.id);
                        if (window.innerWidth < 768) onToggle();
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors group cursor-pointer',
                        selectedProjectId === project.id
                          ? 'bg-gray-100 dark:bg-gray-700'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      )}
                    >
                      <span className={cn('w-3 h-3 rounded-full flex-shrink-0', project.color)} />
                      <span className="flex-1 truncate text-sm text-gray-900 dark:text-white">
                        {project.name}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenSettings(project);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-60 hover:opacity-100 transition-opacity"
                        title="Project settings (rename, delete)"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="6" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="18" r="2" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Add project button */}
          <div className="p-2 pb-20 md:pb-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <span className="w-5 h-5 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </span>
              <span className="text-sm">New Project</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Create project modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewProjectName('');
          setNewProjectColor(projectColors[0]);
        }}
        title="Create Project"
      >
        <div className="space-y-4">
          <Input
            label="Project Name"
            placeholder="Enter project name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            autoFocus
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {projectColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewProjectColor(color)}
                  className={cn(
                    'w-8 h-8 rounded-full transition-transform',
                    color,
                    newProjectColor === color && 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                  )}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowCreateModal(false);
                setNewProjectName('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newProjectName.trim() || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
