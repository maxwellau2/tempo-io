'use client';

import { motion } from 'framer-motion';
import { Button, Input } from '@/components/ui';
import { CALENDAR_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { CalendarEvent, EventFormData } from './types';

interface EventFormProps {
  formData: EventFormData;
  editingEvent: CalendarEvent | null;
  isConnected: boolean;
  isSyncing: boolean;
  onChange: (data: Partial<EventFormData>) => void;
  onSubmit: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onClose: () => void;
}

export function EventForm({
  formData,
  editingEvent,
  isConnected,
  isSyncing,
  onChange,
  onSubmit,
  onDelete,
  onCancel,
  onClose,
}: EventFormProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {editingEvent && (
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Edit Event</h3>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel Edit
          </Button>
        </div>
      )}

      <div className="space-y-3">
        <Input
          label="Title"
          placeholder="Event title"
          value={formData.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
        <Input
          label="Description"
          placeholder="Description (optional)"
          value={formData.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
        <Input
          label="Date"
          type="date"
          value={formData.date}
          onChange={(e) => onChange({ date: e.target.value })}
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="allDay"
            checked={formData.isAllDay}
            onChange={(e) => onChange({ isAllDay: e.target.checked })}
            className="rounded border-gray-300"
          />
          <label htmlFor="allDay" className="text-sm text-gray-700 dark:text-gray-300">
            All day
          </label>
        </div>
        {!formData.isAllDay && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-3"
          >
            <Input
              label="Start time"
              type="time"
              value={formData.startTime}
              onChange={(e) => onChange({ startTime: e.target.value })}
            />
            <Input
              label="End time"
              type="time"
              value={formData.endTime}
              onChange={(e) => onChange({ endTime: e.target.value })}
            />
          </motion.div>
        )}
        {!isConnected && !editingEvent && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {CALENDAR_COLORS.map((color) => (
                <motion.button
                  key={color.id}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onChange({ color: color.bg })}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all',
                    color.bg,
                    formData.color === color.bg && 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                  )}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-between pt-2">
        <div>
          {editingEvent && (
            <Button variant="danger" onClick={onDelete} disabled={isSyncing}>
              Delete
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!formData.title.trim() || !formData.date || isSyncing}
            isLoading={isSyncing}
          >
            {editingEvent ? 'Update Event' : 'Add Event'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
