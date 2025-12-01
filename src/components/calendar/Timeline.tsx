'use client';

import { useRef, useEffect } from 'react';
import { format, isToday, getHours, getMinutes, differenceInMinutes } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TIMELINE_CONFIG } from '@/lib/constants';
import type { CalendarEvent } from './types';

const HOURS = Array.from({ length: TIMELINE_CONFIG.HOURS_IN_DAY }, (_, i) => i);

interface TimelineProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onEventClick: (event: CalendarEvent) => void;
}

export function Timeline({ events, selectedDate, onEventClick }: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const currentHour = new Date().getHours();

  useEffect(() => {
    if (timelineRef.current) {
      const scrollToHour = isToday(selectedDate)
        ? Math.max(0, currentHour - 1)
        : TIMELINE_CONFIG.DEFAULT_SCROLL_HOUR;
      const scrollPosition = scrollToHour * TIMELINE_CONFIG.PIXELS_PER_HOUR;
      timelineRef.current.scrollTop = scrollPosition;
    }
  }, [selectedDate, currentHour]);

  const timedEvents = events.filter((e) => !e.isAllDay);
  const allDayEvents = events.filter((e) => e.isAllDay);

  const getEventPosition = (event: CalendarEvent) => {
    const startHour = getHours(event.date);
    const startMinute = getMinutes(event.date);
    const top = startHour * TIMELINE_CONFIG.PIXELS_PER_HOUR + startMinute;

    let height: number = TIMELINE_CONFIG.PIXELS_PER_HOUR;
    if (event.endDate) {
      const duration = differenceInMinutes(event.endDate, event.date);
      height = Math.max(TIMELINE_CONFIG.MIN_EVENT_HEIGHT, duration);
    }

    return { top, height };
  };

  return (
    <div className="flex flex-col h-full">
      {allDayEvents.length > 0 && (
        <div className="border-b border-gray-200 dark:border-gray-700 p-2 flex-shrink-0">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">All Day</div>
          <div className="space-y-1">
            {allDayEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onEventClick(event)}
                className={cn(
                  'text-xs text-white px-2 py-1 rounded cursor-pointer',
                  'hover:opacity-80 hover:shadow-md transition-all',
                  event.color
                )}
              >
                {event.title}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div ref={timelineRef} className="flex-1 overflow-auto">
        <div
          className="relative"
          style={{ height: `${TIMELINE_CONFIG.HOURS_IN_DAY * TIMELINE_CONFIG.PIXELS_PER_HOUR}px` }}
        >
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute w-full border-t border-gray-100 dark:border-gray-700/50 flex"
              style={{ top: `${hour * TIMELINE_CONFIG.PIXELS_PER_HOUR}px`, height: `${TIMELINE_CONFIG.PIXELS_PER_HOUR}px` }}
            >
              <div className="w-12 flex-shrink-0 text-xs text-gray-400 dark:text-gray-500 pr-2 text-right -mt-2">
                {format(new Date().setHours(hour, 0), 'h a')}
              </div>
              <div className="flex-1 relative" />
            </div>
          ))}

          {isToday(selectedDate) && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              className="absolute left-12 right-0 flex items-center z-20 pointer-events-none origin-left"
              style={{ top: `${currentHour * TIMELINE_CONFIG.PIXELS_PER_HOUR + new Date().getMinutes()}px` }}
            >
              <div className="w-2 h-2 bg-red-500 rounded-full -ml-1 shadow-lg shadow-red-500/50" />
              <div className="flex-1 h-0.5 bg-red-500" />
            </motion.div>
          )}

          {timedEvents.map((event, index) => {
            const { top, height } = getEventPosition(event);
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05, type: 'spring', stiffness: 300 }}
                whileHover={{ scale: 1.02, zIndex: 30 }}
                onClick={() => onEventClick(event)}
                className={cn(
                  'absolute left-14 right-2 text-white text-xs rounded px-2 py-1 cursor-pointer overflow-hidden z-10',
                  'shadow-sm hover:shadow-lg transition-shadow',
                  event.color
                )}
                style={{ top: `${top}px`, height: `${height}px` }}
              >
                <div className="font-medium truncate">{event.title}</div>
                {height > 30 && (
                  <div className="text-white/80 truncate">
                    {format(event.date, 'h:mm a')}
                    {event.endDate && ` - ${format(event.endDate, 'h:mm a')}`}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
