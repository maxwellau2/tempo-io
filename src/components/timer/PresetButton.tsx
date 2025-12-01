'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PresetButtonProps {
  name: string;
  duration: number;
  icon?: string;
  isActive: boolean;
  onClick: () => void;
}

export function PresetButton({ name, duration, icon, isActive, onClick }: PresetButtonProps) {
  const minutes = duration / 60;

  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-lg font-medium text-sm transition-all',
        'flex items-center gap-2',
        isActive
          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
      )}
    >
      {icon && <span>{icon}</span>}
      <span>{name}</span>
      <span className="text-xs opacity-75">({minutes}m)</span>
    </motion.button>
  );
}
