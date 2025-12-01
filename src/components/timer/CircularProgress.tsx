'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CircularProgressProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  trackColor?: string;
  progressColor?: string;
  children?: React.ReactNode;
}

export function CircularProgress({
  progress,
  size = 320,
  strokeWidth = 8,
  className,
  trackColor = 'text-gray-200 dark:text-gray-700',
  progressColor = 'text-blue-500',
  children,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2 - 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const center = size / 2;

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <svg className="absolute w-full h-full -rotate-90">
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className={trackColor}
        />
        {/* Progress arc */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          className={progressColor}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ strokeDasharray: circumference }}
        />
        {/* Glow effect */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth + 4}
          fill="none"
          strokeLinecap="round"
          className={cn(progressColor, 'opacity-20 blur-sm')}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
