'use client';

import { motion, AnimatePresence, HTMLMotionProps } from 'framer-motion';
import { ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { ANIMATION_VARIANTS, TRANSITIONS } from '@/lib/constants';

// Fade in component with optional direction
interface FadeInProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  delay?: number;
  duration?: number;
  className?: string;
}

export const FadeIn = forwardRef<HTMLDivElement, FadeInProps>(
  ({ children, direction = 'up', delay = 0, duration = 0.4, className, ...props }, ref) => {
    const directionOffset = {
      up: { y: 24 },
      down: { y: -24 },
      left: { x: 24 },
      right: { x: -24 },
      none: {},
    };

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, ...directionOffset[direction] }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, ...directionOffset[direction] }}
        transition={{ duration, delay, ease: [0.25, 0.4, 0.25, 1] }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
FadeIn.displayName = 'FadeIn';

// Stagger children animation
interface StaggerContainerProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
}

export function StaggerContainer({ children, staggerDelay = 0.05, className, ...props }: StaggerContainerProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={{
        animate: {
          transition: { staggerChildren: staggerDelay },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Stagger item (use inside StaggerContainer)
interface StaggerItemProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className, ...props }: StaggerItemProps) {
  return (
    <motion.div
      variants={ANIMATION_VARIANTS.fadeInUp}
      transition={TRANSITIONS.smooth}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Scale on hover/tap
interface ScaleOnHoverProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  scale?: number;
  className?: string;
}

export function ScaleOnHover({ children, scale = 1.02, className, ...props }: ScaleOnHoverProps) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={TRANSITIONS.spring}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Glow effect wrapper
interface GlowProps {
  children: ReactNode;
  color?: string;
  className?: string;
  disabled?: boolean;
}

export function Glow({ children, color = 'blue', className, disabled = false }: GlowProps) {
  const glowColors: Record<string, string> = {
    blue: 'group-hover:shadow-blue-500/25',
    green: 'group-hover:shadow-green-500/25',
    purple: 'group-hover:shadow-purple-500/25',
    pink: 'group-hover:shadow-pink-500/25',
    amber: 'group-hover:shadow-amber-500/25',
  };

  if (disabled) return <>{children}</>;

  return (
    <div className={cn('group', className)}>
      <div
        className={cn(
          'transition-shadow duration-300',
          'group-hover:shadow-lg',
          glowColors[color] || glowColors.blue
        )}
      >
        {children}
      </div>
    </div>
  );
}

// Shimmer effect (loading state)
interface ShimmerProps {
  className?: string;
}

export function Shimmer({ className }: ShimmerProps) {
  return (
    <div className={cn('relative overflow-hidden bg-gray-200 dark:bg-gray-700 rounded', className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
}

// Pulse ring effect (for active states)
interface PulseRingProps {
  children: ReactNode;
  isActive?: boolean;
  color?: string;
  className?: string;
}

export function PulseRing({ children, isActive = false, color = 'blue', className }: PulseRingProps) {
  const ringColors: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className={cn('relative', className)}>
      {isActive && (
        <span className="absolute inset-0 rounded-full">
          <span
            className={cn(
              'absolute inset-0 rounded-full animate-ping opacity-75',
              ringColors[color] || ringColors.blue
            )}
          />
        </span>
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

// Number counter animation
interface AnimatedNumberProps {
  value: number;
  className?: string;
  formatFn?: (n: number) => string;
}

export function AnimatedNumber({ value, className, formatFn }: AnimatedNumberProps) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      {formatFn ? formatFn(value) : value}
    </motion.span>
  );
}

// Floating animation (subtle up/down)
interface FloatProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  duration?: number;
  distance?: number;
  className?: string;
}

export function Float({ children, duration = 3, distance = 10, className, ...props }: FloatProps) {
  return (
    <motion.div
      animate={{
        y: [-distance / 2, distance / 2, -distance / 2],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Gradient border animation
interface GradientBorderProps {
  children: ReactNode;
  className?: string;
  borderClassName?: string;
  isAnimating?: boolean;
}

export function GradientBorder({ children, className, borderClassName, isAnimating = true }: GradientBorderProps) {
  return (
    <div className={cn('relative p-[1px] rounded-xl overflow-hidden', className)}>
      <div
        className={cn(
          'absolute inset-0',
          isAnimating && 'animate-[spin_3s_linear_infinite]',
          'bg-[conic-gradient(from_0deg,#3b82f6,#8b5cf6,#ec4899,#3b82f6)]',
          borderClassName
        )}
      />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl">{children}</div>
    </div>
  );
}

// Confetti burst (for celebrations)
interface ConfettiProps {
  isActive: boolean;
}

export function Confetti({ isActive }: ConfettiProps) {
  if (!isActive) return null;

  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: ['#3b82f6', '#22c55e', '#eab308', '#ec4899', '#a855f7'][Math.floor(Math.random() * 5)],
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{ y: -20, x: `${particle.x}vw`, opacity: 1, scale: 1 }}
          animate={{ y: '100vh', opacity: 0, scale: 0, rotate: 360 }}
          transition={{ duration: 2, delay: particle.delay, ease: 'easeOut' }}
          className="absolute w-2 h-2 rounded-full"
          style={{ backgroundColor: particle.color }}
        />
      ))}
    </div>
  );
}

// Re-export AnimatePresence for convenience
export { AnimatePresence, motion };
