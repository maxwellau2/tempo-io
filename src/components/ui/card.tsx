import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'glass';
  hover?: boolean;
  glow?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'default', hover = false, glow = false, children, ...props }, ref) => {
    const variants = {
      default: 'bg-white dark:bg-gray-800 shadow-sm',
      bordered: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
      glass: 'glass',
    };

    const hoverStyles = hover
      ? 'transition-all duration-300 hover:shadow-lg hover:-translate-y-1'
      : '';

    const glowStyles = glow
      ? 'hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20'
      : '';

    return (
      <div
        ref={ref}
        className={cn('rounded-xl', variants[variant], hoverStyles, glowStyles, className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export { Card };
