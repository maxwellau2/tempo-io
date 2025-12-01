'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { ProjectStatus, Task } from '@/types';

interface KanbanMinimapProps {
  statuses: ProjectStatus[];
  tasksByStatus: Record<string, Task[]>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function KanbanMinimap({ statuses, tasksByStatus, scrollContainerRef }: KanbanMinimapProps) {
  const minimapRef = useRef<HTMLDivElement>(null);
  const [viewportPosition, setViewportPosition] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(100);
  const [isDragging, setIsDragging] = useState(false);

  // Update viewport indicator based on scroll position
  const updateViewport = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const scrollPercentage = scrollWidth > clientWidth
      ? (scrollLeft / (scrollWidth - clientWidth)) * 100
      : 0;
    const viewportPercentage = (clientWidth / scrollWidth) * 100;

    setViewportPosition(scrollPercentage);
    setViewportWidth(Math.min(viewportPercentage, 100));
  }, [scrollContainerRef]);

  // Listen to scroll events
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    updateViewport();
    container.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);

    return () => {
      container.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, [scrollContainerRef, updateViewport]);

  // Handle minimap click/drag to scroll
  const handleMinimapInteraction = useCallback((clientX: number) => {
    const container = scrollContainerRef.current;
    const minimap = minimapRef.current;
    if (!container || !minimap) return;

    const rect = minimap.getBoundingClientRect();
    const clickPosition = (clientX - rect.left) / rect.width;
    const maxScroll = container.scrollWidth - container.clientWidth;

    // Center the viewport on click position
    const targetScroll = clickPosition * container.scrollWidth - container.clientWidth / 2;
    container.scrollTo({
      left: Math.max(0, Math.min(targetScroll, maxScroll)),
      behavior: isDragging ? 'auto' : 'smooth',
    });
  }, [scrollContainerRef, isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleMinimapInteraction(e.clientX);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      handleMinimapInteraction(e.clientX);
    }
  }, [isDragging, handleMinimapInteraction]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Don't show minimap if all columns fit
  if (viewportWidth >= 95) return null;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
      <div
        ref={minimapRef}
        className="flex gap-1 p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 cursor-pointer select-none"
        onMouseDown={handleMouseDown}
      >
        {/* Minimap columns */}
        <div className="flex gap-1 relative">
          {statuses.map((status) => {
            const tasks = tasksByStatus[status.id] || [];
            const isCustomColor = status.color.startsWith('rgba') || status.color.startsWith('#');

            return (
              <div
                key={status.id}
                className={cn(
                  'w-8 h-12 rounded flex flex-col gap-0.5 p-1 overflow-hidden',
                  !isCustomColor && status.color
                )}
                style={isCustomColor ? { backgroundColor: status.color } : undefined}
                title={`${status.name} (${tasks.length})`}
              >
                {/* Mini task indicators */}
                {tasks.slice(0, 5).map((task, i) => (
                  <div
                    key={task.id}
                    className="h-1.5 rounded-sm bg-white/60 dark:bg-gray-300/60"
                  />
                ))}
                {tasks.length > 5 && (
                  <div className="text-[6px] text-gray-500 dark:text-gray-400 text-center">
                    +{tasks.length - 5}
                  </div>
                )}
              </div>
            );
          })}

          {/* Viewport indicator */}
          <div
            className="absolute top-0 bottom-0 border-2 border-gray-400 dark:border-gray-500 rounded bg-white/20 dark:bg-white/10 transition-all pointer-events-none"
            style={{
              left: `${viewportPosition * (100 - viewportWidth) / 100}%`,
              width: `${viewportWidth}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
