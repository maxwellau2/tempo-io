'use client';

import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from './types';

interface EventListProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onEventDelete: (event: CalendarEvent) => void;
}

export function EventList({ events, onEventClick, onEventDelete }: EventListProps) {
  if (events.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Events</h3>
      {events.map((event, index) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ scale: 1.01, x: 4 }}
          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer group"
          onClick={() => onEventClick(event)}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <motion.div
              whileHover={{ scale: 1.2 }}
              className={cn('w-3 h-3 rounded-full flex-shrink-0', event.color)}
            />
            <div className="min-w-0">
              <span className="text-sm text-gray-900 dark:text-white block truncate">
                {event.title}
              </span>
              <span className="text-xs text-gray-500">
                {!event.isAllDay && format(event.date, 'h:mm a')}
                {!event.isAllDay && event.endDate && ` - ${format(event.endDate, 'h:mm a')}`}
                {event.isAllDay && 'All day'}
                {' • '}
                {event.isGoogleEvent ? 'Google Calendar' : 'Local'}
              </span>
            </div>
          </div>
          <motion.button
            initial={{ opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            onClick={(e) => {
              e.stopPropagation();
              onEventDelete(event);
            }}
            className="text-red-500 hover:text-red-600 text-sm flex-shrink-0 ml-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </motion.button>
        </motion.div>
      ))}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Add New Event</h3>
      </div>
    </div>
  );
}
