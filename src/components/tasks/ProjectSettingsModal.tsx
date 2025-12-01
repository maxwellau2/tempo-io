'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button, Input, Modal } from '@/components/ui';
import type { Project, ProjectStatus } from '@/types';
import { STATUS_ICONS } from '@/lib/constants';
// Helper to convert hex to Tailwind-style bg color with opacity
const hexToRgba = (hex: string, opacity: number = 0.15): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Extract hex color from rgba or return default
const getHexFromStyle = (color: string): string => {
  if (color.startsWith('#')) return color;
  if (color.startsWith('rgba')) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
  }
  // Default colors for legacy Tailwind classes
  if (color.includes('gray')) return '#6b7280';
  if (color.includes('blue')) return '#3b82f6';
  if (color.includes('green')) return '#22c55e';
  if (color.includes('yellow')) return '#eab308';
  if (color.includes('red')) return '#ef4444';
  if (color.includes('purple')) return '#a855f7';
  if (color.includes('pink')) return '#ec4899';
  if (color.includes('indigo')) return '#6366f1';
  return '#6b7280';
};

interface ProjectSettingsModalProps {
  project: Project | null;
  statuses: ProjectStatus[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateProject: (updates: Partial<Pick<Project, 'name' | 'color'>>) => Promise<void>;
  onDeleteProject: () => Promise<void>;
  onAddStatus: (name: string, icon: string, color: string) => Promise<void>;
  onUpdateStatus: (statusId: string, updates: Partial<Pick<ProjectStatus, 'name' | 'icon' | 'color'>>) => Promise<void>;
  onDeleteStatus: (statusId: string) => Promise<void>;
  projectColors: readonly string[];
}

export function ProjectSettingsModal({
  project,
  statuses,
  isOpen,
  onClose,
  onUpdateProject,
  onDeleteProject,
  onAddStatus,
  onUpdateStatus,
  onDeleteStatus,
  projectColors,
}: ProjectSettingsModalProps) {
  const [projectName, setProjectName] = useState(project?.name || '');
  const [projectColor, setProjectColor] = useState(project?.color || projectColors[0]);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusIcon, setNewStatusIcon] = useState<string>(STATUS_ICONS[0]);
  const [newStatusColor, setNewStatusColor] = useState('#6b7280');
  const [showAddStatus, setShowAddStatus] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Reset form when project changes
  useState(() => {
    if (project) {
      setProjectName(project.name);
      setProjectColor(project.color);
    }
  });

  const handleSaveProject = async () => {
    if (!projectName.trim()) return;

    try {
      setIsUpdating(true);
      await onUpdateProject({ name: projectName.trim(), color: projectColor });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddStatus = async () => {
    if (!newStatusName.trim()) return;

    try {
      setIsUpdating(true);
      // Convert hex to rgba for the background color
      const bgColor = hexToRgba(newStatusColor, 0.15);
      await onAddStatus(newStatusName.trim(), newStatusIcon, bgColor);
      setNewStatusName('');
      setNewStatusIcon(STATUS_ICONS[0]);
      setNewStatusColor('#6b7280');
      setShowAddStatus(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteProject = async () => {
    try {
      setIsUpdating(true);
      await onDeleteProject();
      onClose();
    } finally {
      setIsUpdating(false);
    }
  };

  if (!project) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Project Settings" size="lg">
      <div className="space-y-6">
        {/* Project details */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Project Details</h3>

          <Input
            label="Name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onBlur={handleSaveProject}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {projectColors.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    setProjectColor(color);
                    onUpdateProject({ color });
                  }}
                  className={cn(
                    'w-8 h-8 rounded-full transition-transform',
                    color,
                    projectColor === color && 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Status columns */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Status Columns</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddStatus(true)}
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {statuses.map((status) => (
              <div
                key={status.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                style={{ backgroundColor: status.color.startsWith('rgba') || status.color.startsWith('#') ? status.color : undefined }}
              >
                {editingStatusId === status.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <select
                      value={status.icon}
                      onChange={(e) => onUpdateStatus(status.id, { icon: e.target.value })}
                      className="bg-transparent border-none text-lg cursor-pointer"
                    >
                      {STATUS_ICONS.map((icon) => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={status.name}
                      onChange={(e) => onUpdateStatus(status.id, { name: e.target.value })}
                      className="flex-1 bg-transparent border-none text-sm text-gray-900 dark:text-white focus:outline-none"
                      autoFocus
                    />
                    <input
                      type="color"
                      value={getHexFromStyle(status.color)}
                      onChange={(e) => onUpdateStatus(status.id, { color: hexToRgba(e.target.value, 0.15) })}
                      className="w-8 h-8 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
                      title="Pick a color"
                    />
                    <button
                      onClick={() => setEditingStatusId(null)}
                      className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-lg">{status.icon}</span>
                    <span className="flex-1 text-sm text-gray-900 dark:text-white">{status.name}</span>
                    <button
                      onClick={() => setEditingStatusId(status.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    {statuses.length > 1 && (
                      <button
                        onClick={() => onDeleteStatus(status.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Add status form */}
          {showAddStatus && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <select
                  value={newStatusIcon}
                  onChange={(e) => setNewStatusIcon(e.target.value)}
                  className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-lg"
                >
                  {STATUS_ICONS.map((icon) => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
                <Input
                  placeholder="Status name"
                  value={newStatusName}
                  onChange={(e) => setNewStatusName(e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 dark:text-gray-400">Color:</label>
                <input
                  type="color"
                  value={newStatusColor}
                  onChange={(e) => setNewStatusColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
                />
                <div
                  className="flex-1 h-8 rounded"
                  style={{ backgroundColor: hexToRgba(newStatusColor, 0.15) }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAddStatus(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddStatus} disabled={!newStatusName.trim() || isUpdating}>
                  Add Status
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Danger zone */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-3">Danger Zone</h3>
          {showDeleteConfirm ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg space-y-3">
              <p className="text-sm text-red-700 dark:text-red-300">
                Are you sure you want to delete this project? All tasks in this project will be permanently deleted.
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="danger" size="sm" onClick={handleDeleteProject} disabled={isUpdating}>
                  {isUpdating ? 'Deleting...' : 'Delete Project'}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
              Delete Project
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
