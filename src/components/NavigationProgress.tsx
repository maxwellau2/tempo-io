'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { UI_TIMING, UI_SIZES } from '@/lib/constants';

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Reset on route change complete
    setIsNavigating(false);
    setProgress(100);

    const timeout = setTimeout(() => setProgress(0), UI_TIMING.NAV_PROGRESS_RESET);
    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);

  // Listen for navigation start
  useEffect(() => {
    const handleStart = () => {
      setIsNavigating(true);
      setProgress(UI_TIMING.NAV_PROGRESS_INITIAL);

      // Simulate progress
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= UI_TIMING.NAV_PROGRESS_CAP) {
            clearInterval(interval);
            return prev;
          }
          return prev + UI_TIMING.NAV_PROGRESS_INCREMENT;
        });
      }, UI_TIMING.NAV_PROGRESS_INTERVAL);

      return () => clearInterval(interval);
    };

    // Use click events on links to detect navigation
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      if (link && link.href && link.href.startsWith(window.location.origin)) {
        const url = new URL(link.href);
        if (url.pathname !== pathname) {
          handleStart();
        }
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [pathname]);

  return (
    <AnimatePresence>
      {(isNavigating || progress > 0) && progress < 100 && (
        <motion.div
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: progress / 100, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className={`fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 origin-left z-[${UI_SIZES.Z_INDEX.NAVIGATION_PROGRESS}]`}
        />
      )}
    </AnimatePresence>
  );
}
