'use client';

import { format, isSameMonth, isSameDay, isToday } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { WEEK_DAYS } from '@/lib/constants';
import type { CalendarEvent } from './types';

interface CalendarGridProps {
  days: Date[];
  currentMonth: Date;
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
}

export function CalendarGrid({ days, currentMonth, events, onDateClick }: CalendarGridProps) {
  const getEventsForDate = (date: Date) => {
    return events.filter((event) => isSameDay(event.date, date));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-sm"
    >
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {WEEK_DAYS.map((day) => (
          <div
            key={day}
            className="py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayEvents = getEventsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isCurrentDay = isToday(day);

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.01 }}
              whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
              onClick={() => onDateClick(day)}
              className={cn(
                'min-h-[100px] p-2 border-b border-r border-gray-200 dark:border-gray-700 cursor-pointer',
                'transition-colors',
                !isCurrentMonth && 'bg-gray-50 dark:bg-gray-800/50'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <motion.span
                  whileHover={{ scale: 1.1 }}
                  className={cn(
                    'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-colors',
                    isCurrentDay && 'bg-blue-500 text-white shadow-lg shadow-blue-500/30',
                    !isCurrentDay && !isCurrentMonth && 'text-gray-400 dark:text-gray-600',
                    !isCurrentDay && isCurrentMonth && 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                >
                  {format(day, 'd')}
                </motion.span>
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 2).map((event, eventIdx) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: eventIdx * 0.1 }}
                    className={cn(
                      'text-xs text-white px-2 py-0.5 rounded truncate',
                      'hover:shadow-md transition-shadow',
                      event.color
                    )}
                    title={event.title}
                  >
                    {event.title}
                  </motion.div>
                ))}
                {dayEvents.length > 2 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-gray-500 dark:text-gray-400 px-2 font-medium"
                  >
                    +{dayEvents.length - 2} more
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
