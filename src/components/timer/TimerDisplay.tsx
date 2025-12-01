'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TIME_UNITS } from '@/lib/constants';

interface TimerDisplayProps {
  timeRemaining: number;
  isRunning: boolean;
  onTimeChange: (seconds: number) => void;
}

type EditingField = 'hours' | 'minutes' | 'seconds' | null;

export function TimerDisplay({ timeRemaining, isRunning, onTimeChange }: TimerDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editHours, setEditHours] = useState('0');
  const [editMinutes, setEditMinutes] = useState('25');
  const [editSeconds, setEditSeconds] = useState('00');

  const hoursInputRef = useRef<HTMLInputElement>(null);
  const minutesInputRef = useRef<HTMLInputElement>(null);
  const secondsInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number): { hours: string; minutes: string; seconds: string; showHours: boolean } => {
    const hrs = Math.floor(seconds / TIME_UNITS.SECONDS_PER_HOUR);
    const mins = Math.floor((seconds % TIME_UNITS.SECONDS_PER_HOUR) / TIME_UNITS.SECONDS_PER_MINUTE);
    const secs = seconds % TIME_UNITS.SECONDS_PER_MINUTE;
    return {
      hours: hrs.toString().padStart(2, '0'),
      minutes: mins.toString().padStart(2, '0'),
      seconds: secs.toString().padStart(2, '0'),
      showHours: hrs > 0 || isEditing,
    };
  };

  const time = formatTime(timeRemaining);

  const startEditing = (field: EditingField = 'minutes') => {
    if (isRunning) return;

    const hrs = Math.floor(timeRemaining / TIME_UNITS.SECONDS_PER_HOUR);
    const mins = Math.floor((timeRemaining % TIME_UNITS.SECONDS_PER_HOUR) / TIME_UNITS.SECONDS_PER_MINUTE);
    const secs = timeRemaining % TIME_UNITS.SECONDS_PER_MINUTE;

    setEditHours(hrs.toString());
    setEditMinutes(mins.toString());
    setEditSeconds(secs.toString().padStart(2, '0'));
    setIsEditing(true);
    setEditingField(field);

    setTimeout(() => {
      const ref = field === 'hours' ? hoursInputRef : field === 'minutes' ? minutesInputRef : secondsInputRef;
      ref.current?.focus();
      ref.current?.select();
    }, 0);
  };

  const handleSubmit = useCallback(() => {
    const hrs = parseInt(editHours) || 0;
    const mins = parseInt(editMinutes) || 0;
    const secs = parseInt(editSeconds) || 0;
    const totalSeconds = hrs * TIME_UNITS.SECONDS_PER_HOUR + mins * TIME_UNITS.SECONDS_PER_MINUTE + secs;

    if (totalSeconds > 0) {
      onTimeChange(totalSeconds);
    }
    setIsEditing(false);
    setEditingField(null);
  }, [editHours, editMinutes, editSeconds, onTimeChange]);

  // Handle clicks outside the editing area
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleSubmit();
      }
    };

    // Delay adding listener to avoid immediate trigger
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, handleSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent, field: EditingField) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditingField(null);
    } else if (e.key === 'ArrowRight' || e.key === 'Tab') {
      if (field === 'hours') {
        e.preventDefault();
        minutesInputRef.current?.focus();
        minutesInputRef.current?.select();
        setEditingField('minutes');
      } else if (field === 'minutes') {
        e.preventDefault();
        secondsInputRef.current?.focus();
        secondsInputRef.current?.select();
        setEditingField('seconds');
      } else if (field === 'seconds' && e.key === 'Tab') {
        // Allow default tab behavior to exit
      }
    } else if (e.key === 'ArrowLeft') {
      if (field === 'seconds') {
        e.preventDefault();
        minutesInputRef.current?.focus();
        minutesInputRef.current?.select();
        setEditingField('minutes');
      } else if (field === 'minutes') {
        e.preventDefault();
        hoursInputRef.current?.focus();
        hoursInputRef.current?.select();
        setEditingField('hours');
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (field === 'hours') {
        setEditHours((prev) => (Math.min(99, (parseInt(prev) || 0) + 1)).toString());
      } else if (field === 'minutes') {
        setEditMinutes((prev) => (Math.min(59, (parseInt(prev) || 0) + 1)).toString());
      } else if (field === 'seconds') {
        setEditSeconds((prev) => (Math.min(59, (parseInt(prev) || 0) + 1)).toString().padStart(2, '0'));
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (field === 'hours') {
        setEditHours((prev) => (Math.max(0, (parseInt(prev) || 0) - 1)).toString());
      } else if (field === 'minutes') {
        setEditMinutes((prev) => (Math.max(0, (parseInt(prev) || 0) - 1)).toString());
      } else if (field === 'seconds') {
        setEditSeconds((prev) => (Math.max(0, (parseInt(prev) || 0) - 1)).toString().padStart(2, '0'));
      }
    }
  };

  const handleFieldClick = (field: EditingField) => {
    if (isRunning) return;

    if (!isEditing) {
      startEditing(field);
    } else {
      setEditingField(field);
      const ref = field === 'hours' ? hoursInputRef : field === 'minutes' ? minutesInputRef : secondsInputRef;
      setTimeout(() => {
        ref.current?.focus();
        ref.current?.select();
      }, 0);
    }
  };

  const inputClassName = (field: EditingField) => cn(
    'text-5xl sm:text-6xl font-mono font-bold text-center bg-transparent focus:outline-none transition-colors',
    'text-gray-900 dark:text-white',
    editingField === field ? 'border-b-2 border-blue-500' : 'border-b-2 border-transparent',
  );

  return (
    <div className="text-center z-10" ref={containerRef}>
      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="editing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center justify-center"
          >
            {/* Hours */}
            <input
              ref={hoursInputRef}
              type="text"
              value={editHours}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                const numValue = parseInt(value) || 0;
                if (numValue <= 99) {
                  setEditHours(value);
                }
              }}
              onKeyDown={(e) => handleKeyDown(e, 'hours')}
              onClick={() => handleFieldClick('hours')}
              className={cn(inputClassName('hours'), 'w-16 sm:w-20')}
              placeholder="0"
              maxLength={2}
            />
            <span className="text-5xl sm:text-6xl font-mono font-bold text-gray-400 dark:text-gray-500 mx-1">:</span>

            {/* Minutes */}
            <input
              ref={minutesInputRef}
              type="text"
              value={editMinutes}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                const numValue = parseInt(value) || 0;
                if (numValue <= 59) {
                  setEditMinutes(value);
                }
              }}
              onKeyDown={(e) => handleKeyDown(e, 'minutes')}
              onClick={() => handleFieldClick('minutes')}
              className={cn(inputClassName('minutes'), 'w-16 sm:w-20')}
              placeholder="00"
              maxLength={2}
            />
            <span className="text-5xl sm:text-6xl font-mono font-bold text-gray-400 dark:text-gray-500 mx-1">:</span>

            {/* Seconds */}
            <input
              ref={secondsInputRef}
              type="text"
              value={editSeconds}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                const numValue = parseInt(value) || 0;
                if (numValue <= 59) {
                  setEditSeconds(value.padStart(2, '0'));
                }
              }}
              onKeyDown={(e) => handleKeyDown(e, 'seconds')}
              onClick={() => handleFieldClick('seconds')}
              className={cn(inputClassName('seconds'), 'w-16 sm:w-20')}
              placeholder="00"
              maxLength={2}
            />
          </motion.div>
        ) : (
          <motion.div
            key="display"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center justify-center"
          >
            {time.showHours && (
              <>
                <motion.span
                  onClick={() => handleFieldClick('hours')}
                  className={cn(
                    'text-5xl sm:text-6xl font-mono font-bold text-gray-900 dark:text-white',
                    !isRunning && 'cursor-pointer hover:text-blue-500 transition-colors'
                  )}
                  whileHover={!isRunning ? { scale: 1.05 } : {}}
                >
                  {time.hours}
                </motion.span>
                <span className="text-5xl sm:text-6xl font-mono font-bold text-gray-400 dark:text-gray-500 mx-1">:</span>
              </>
            )}
            <motion.span
              onClick={() => handleFieldClick('minutes')}
              className={cn(
                'text-5xl sm:text-6xl font-mono font-bold text-gray-900 dark:text-white',
                !isRunning && 'cursor-pointer hover:text-blue-500 transition-colors'
              )}
              whileHover={!isRunning ? { scale: 1.05 } : {}}
            >
              {time.minutes}
            </motion.span>
            <span className="text-5xl sm:text-6xl font-mono font-bold text-gray-400 dark:text-gray-500 mx-1">:</span>
            <motion.span
              onClick={() => handleFieldClick('seconds')}
              className={cn(
                'text-5xl sm:text-6xl font-mono font-bold text-gray-900 dark:text-white',
                !isRunning && 'cursor-pointer hover:text-blue-500 transition-colors'
              )}
              whileHover={!isRunning ? { scale: 1.05 } : {}}
            >
              {time.seconds}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-gray-500 dark:text-gray-400 mt-2"
      >
        {isEditing ? (
          <span className="text-blue-500 text-sm">
            Use arrow keys to navigate and adjust
          </span>
        ) : isRunning ? (
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Running
          </motion.span>
        ) : timeRemaining === 0 ? (
          <span className="text-green-500 font-medium">Complete!</span>
        ) : (
          <span className="text-sm">Click time to edit</span>
        )}
      </motion.div>
    </div>
  );
}
