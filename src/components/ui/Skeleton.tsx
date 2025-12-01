import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200 dark:bg-gray-700',
        className
      )}
    />
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600">
      <div className="flex items-start justify-between gap-2 mb-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function KanbanColumnSkeleton() {
  return (
    <div className="flex-1 min-w-[280px] md:min-w-[300px] rounded-xl p-3 md:p-4 bg-gray-100 dark:bg-gray-800">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-8 rounded-full" />
      </div>
      <div className="space-y-3">
        <TaskCardSkeleton />
        <TaskCardSkeleton />
        <TaskCardSkeleton />
      </div>
    </div>
  );
}

export function CalendarEventSkeleton() {
  return (
    <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <Skeleton className="w-1 h-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function CalendarDaySkeleton() {
  return (
    <div className="space-y-2">
      <CalendarEventSkeleton />
      <CalendarEventSkeleton />
    </div>
  );
}

export function ProjectSidebarSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <Skeleton className="w-3 h-3 rounded-full" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}
