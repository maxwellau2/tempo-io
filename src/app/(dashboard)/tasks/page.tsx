'use client';

import { useState, useRef, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Input, Modal, FadeIn, KanbanColumnSkeleton } from '@/components/ui';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useProjectsSWR } from '@/hooks/useProjectsSWR';
import { useTasksSWR } from '@/hooks/useTasksSWR';
import { ProjectSidebar } from '@/components/tasks/ProjectSidebar';
import { ProjectSettingsModal } from '@/components/tasks/ProjectSettingsModal';
import { KanbanMinimap } from '@/components/tasks/KanbanMinimap';
import type { Task, TaskPriority, Project, ProjectStatus } from '@/types';

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function SortableTask({
  task,
  statuses,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  task: Task;
  statuses: ProjectStatus[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, statusId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const currentIndex = statuses.findIndex(s => s.id === task.status_id);
  const nextStatus = currentIndex < statuses.length - 1 ? statuses[currentIndex + 1] : null;
  const prevStatus = currentIndex > 0 ? statuses[currentIndex - 1] : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600',
        'cursor-grab active:cursor-grabbing',
        'hover:shadow-md',
        'transition-shadow group touch-manipulation'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-gray-900 dark:text-white">{task.title}</h3>
        <span className={cn('text-xs px-2 py-0.5 rounded flex-shrink-0', PRIORITY_COLORS[task.priority])}>
          {task.priority}
        </span>
      </div>
      {task.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
          {task.description}
        </p>
      )}
      {task.scheduled_date && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {new Date(task.scheduled_date).toLocaleDateString()}
        </p>
      )}

      {/* Mobile-friendly status change buttons */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 dark:border-gray-600">
        <div className="flex gap-1 md:hidden">
          {prevStatus && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onStatusChange(task.id, prevStatus.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-1.5 rounded bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 active:scale-95 transition-transform"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {nextStatus && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onStatusChange(task.id, nextStatus.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className={cn(
                'p-1.5 rounded active:scale-95 transition-transform',
                'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity ml-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onEdit(task);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-xs text-blue-500 hover:text-blue-600 font-medium px-2 py-1 active:scale-95 transition-transform"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDelete(task.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 active:scale-95 transition-transform"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function DroppableColumn({
  status,
  tasks,
  allStatuses,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  status: ProjectStatus;
  tasks: Task[];
  allStatuses: ProjectStatus[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, statusId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
  });

  // Check if color is a CSS color value (rgba, hex) or Tailwind class
  const isCustomColor = status.color.startsWith('rgba') || status.color.startsWith('#');

  return (
    <div
      className={cn(
        'flex-1 min-w-[280px] md:min-w-[300px] rounded-xl p-3 md:p-4 transition-all',
        !isCustomColor && status.color,
        isOver && 'ring-2 ring-blue-500 ring-inset'
      )}
      style={isCustomColor ? { backgroundColor: status.color } : undefined}
    >
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 text-sm md:text-base">
          <span>{status.icon}</span>
          {status.name}
        </h2>
        <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-900/50 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className="min-h-[200px] sm:min-h-[300px] rounded-lg transition-colors"
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 md:space-y-3">
            {tasks.map((task) => (
              <SortableTask
                key={task.id}
                task={task}
                statuses={allStatuses}
                onEdit={onEdit}
                onDelete={onDelete}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        </SortableContext>
        {tasks.length === 0 && (
          <div
            className={cn(
              'h-full min-h-[150px] sm:min-h-[200px] flex items-center justify-center border-2 border-dashed rounded-lg transition-all',
              isOver
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                : 'border-gray-300 dark:border-gray-600'
            )}
          >
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {isOver ? 'Drop here' : 'No tasks'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const {
    projects,
    statuses,
    isLoading: projectsLoading,
    createProject,
    updateProject,
    deleteProject,
    addStatus,
    updateStatus,
    deleteStatus,
    PROJECT_COLORS,
  } = useProjectsSWR();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsProject, setSettingsProject] = useState<Project | null>(null);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);

  // Auto-select first project
  if (!selectedProjectId && projects.length > 0 && !projectsLoading) {
    setSelectedProjectId(projects[0].id);
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;
  const projectStatuses = selectedProjectId ? (statuses[selectedProjectId] || []) : [];

  const {
    tasks,
    isLoading: tasksLoading,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    getTasksByStatus,
  } = useTasksSWR(selectedProjectId);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Memoize tasks by status for minimap
  const tasksByStatus = useMemo(() => {
    const result: Record<string, Task[]> = {};
    projectStatuses.forEach(status => {
      result[status.id] = getTasksByStatus(status.id);
    });
    return result;
  }, [projectStatuses, getTasksByStatus, tasks]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    scheduled_date: '',
    status_id: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Check if dropping over a column (status)
    const isOverColumn = projectStatuses.some((s) => s.id === overId);
    if (isOverColumn && activeTask.status_id !== overId) {
      moveTask(activeId, overId, 0);
      return;
    }

    // Check if dropping over another task
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask && activeTask.status_id !== overTask.status_id) {
      moveTask(activeId, overTask.status_id!, overTask.position);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const isOverColumn = projectStatuses.some((s) => s.id === overId);
    if (isOverColumn) return;

    if (activeId !== overId) {
      const activeTask = tasks.find(t => t.id === activeId);
      const overTask = tasks.find(t => t.id === overId);
      if (activeTask && overTask && activeTask.status_id === overTask.status_id) {
        // Reordering within same column - handled by optimistic update in moveTask
      }
    }
  };

  const openAddModal = () => {
    if (!projectStatuses.length) return;
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      scheduled_date: '',
      status_id: projectStatuses[0].id,
    });
    setShowModal(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      scheduled_date: task.scheduled_date || '',
      status_id: task.status_id || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.status_id || isSubmitting) return;

    try {
      setIsSubmitting(true);
      if (editingTask) {
        await updateTask(editingTask.id, {
          title: formData.title,
          description: formData.description || null,
          priority: formData.priority,
          scheduled_date: formData.scheduled_date || null,
          status_id: formData.status_id,
        });
      } else {
        await createTask(formData.status_id, formData.title, {
          description: formData.description || undefined,
          priority: formData.priority,
          scheduled_date: formData.scheduled_date || undefined,
        });
      }

      setShowModal(false);
      setFormData({ title: '', description: '', priority: 'medium', scheduled_date: '', status_id: '' });
    } catch (err) {
      console.error('Failed to save task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask(id);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleStatusChange = async (taskId: string, newStatusId: string) => {
    try {
      await moveTask(taskId, newStatusId, 0);
    } catch (err) {
      console.error('Failed to change status:', err);
    }
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  const isLoading = projectsLoading || tasksLoading;

  return (
    <div className="flex h-[calc(100vh-120px)] md:h-[calc(100vh-100px)] -mx-4 sm:-mx-6 lg:-mx-8 -my-6 sm:-my-8">
      <ProjectSidebar
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        onCreateProject={createProject}
        onOpenSettings={setSettingsProject}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        projectColors={PROJECT_COLORS}
        openCreateModal={showCreateProjectModal}
        onCreateModalChange={setShowCreateProjectModal}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="md:hidden w-10" /> {/* Spacer for mobile toggle */}
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {selectedProject?.name || 'Tasks'}
            </h1>
          </div>
          {selectedProject && projectStatuses.length > 0 && (
            <Button onClick={openAddModal}>Add Task</Button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4 sm:p-6 lg:p-8">
          {isLoading ? (
            <div className="flex gap-3 md:gap-6 overflow-x-auto h-full pb-4 px-8">
              <KanbanColumnSkeleton />
              <KanbanColumnSkeleton />
              <KanbanColumnSkeleton />
            </div>
          ) : projects.length === 0 ? (
            <FadeIn direction="up" className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Create your first project
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
                Projects help you organize your tasks
              </p>
              <button
                onClick={() => setShowCreateProjectModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Project
              </button>
            </FadeIn>
          ) : !selectedProject ? (
            <FadeIn direction="up" className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400">Select a project from the sidebar</p>
            </FadeIn>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="relative h-full">
                {/* Fade gradient on left edge */}
                <div className="absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-gray-50 dark:from-gray-900 to-transparent pointer-events-none z-10" />
                {/* Fade gradient on right edge */}
                <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-gray-50 dark:from-gray-900 to-transparent pointer-events-none z-10" />

                <div
                  ref={scrollContainerRef}
                  className="flex gap-3 md:gap-6 overflow-x-auto h-full pb-4 snap-x snap-mandatory md:snap-none px-8"
                >
                  {projectStatuses.map((status, index) => (
                    <motion.div
                      key={status.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="snap-center shrink-0 w-[85vw] md:w-auto md:flex-1"
                    >
                      <DroppableColumn
                        status={status}
                        tasks={getTasksByStatus(status.id)}
                        allStatuses={projectStatuses}
                        onEdit={openEditModal}
                        onDelete={handleDelete}
                        onStatusChange={handleStatusChange}
                      />
                    </motion.div>
                  ))}
                </div>

                {/* Minimap */}
                <KanbanMinimap
                  statuses={projectStatuses}
                  tasksByStatus={tasksByStatus}
                  scrollContainerRef={scrollContainerRef}
                />
              </div>

              <DragOverlay>
                {activeTask && (
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-2xl border-2 border-blue-500 w-[280px] rotate-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {activeTask.title}
                      </h3>
                      <span className={cn('text-xs px-2 py-0.5 rounded', PRIORITY_COLORS[activeTask.priority])}>
                        {activeTask.priority}
                      </span>
                    </div>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </main>

      {/* Task Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingTask ? 'Edit Task' : 'Add Task'}
      >
        <div className="space-y-4">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
            placeholder="Enter task title"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter description (optional)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={formData.status_id}
              onChange={(e) => setFormData((f) => ({ ...f, status_id: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {projectStatuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.icon} {status.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
              className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <Input
            label="Scheduled Date"
            type="date"
            value={formData.scheduled_date}
            onChange={(e) => setFormData((f) => ({ ...f, scheduled_date: e.target.value }))}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.title.trim() || isSubmitting}>
              {isSubmitting ? 'Saving...' : editingTask ? 'Save Changes' : 'Add Task'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Project Settings Modal */}
      <ProjectSettingsModal
        project={settingsProject}
        statuses={settingsProject ? (statuses[settingsProject.id] || []) : []}
        isOpen={!!settingsProject}
        onClose={() => setSettingsProject(null)}
        onUpdateProject={async (updates) => {
          if (settingsProject) {
            await updateProject(settingsProject.id, updates);
            setSettingsProject({ ...settingsProject, ...updates } as Project);
          }
        }}
        onDeleteProject={async () => {
          if (settingsProject) {
            const projectToDelete = settingsProject.id;
            setSettingsProject(null); // Close modal first
            await deleteProject(projectToDelete);
            if (selectedProjectId === projectToDelete) {
              setSelectedProjectId(projects.find(p => p.id !== projectToDelete)?.id || null);
            }
          }
        }}
        onAddStatus={async (name, icon, color) => {
          if (settingsProject) {
            await addStatus(settingsProject.id, name, icon, color);
          }
        }}
        onUpdateStatus={async (statusId, updates) => {
          if (settingsProject) {
            await updateStatus(statusId, settingsProject.id, updates);
          }
        }}
        onDeleteStatus={async (statusId) => {
          if (settingsProject) {
            await deleteStatus(statusId, settingsProject.id);
          }
        }}
        projectColors={PROJECT_COLORS}
      />
    </div>
  );
}
