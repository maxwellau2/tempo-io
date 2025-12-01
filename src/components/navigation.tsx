'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useTimerStore } from '@/stores/timerStore';
import { useTeamStore } from '@/stores/teamStore';
import { useNotifications } from '@/hooks/useNotificationsSWR';
import { APP_CONFIG, TIMER_INTERVALS } from '@/lib/constants';

const navItems = [
  { href: '/timer', label: 'Timer', icon: TimerIcon },
  { href: '/calendar', label: 'Calendar', icon: CalendarIcon },
  { href: '/tasks', label: 'Tasks', icon: TasksIcon },
  { href: '/notes', label: 'Notes', icon: NotesIcon },
  { href: '/teams', label: 'Teams', icon: TeamsIcon },
];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getTeamInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    // Single word: take first 2-3 characters
    return name.slice(0, 3).toUpperCase();
  }
  // Multiple words: take first letter of each word (max 3)
  return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
}

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const { timeRemaining, totalTime, isRunning, syncTime, tick, setIsAlarmPlaying } = useTimerStore();
  const { mode, activeTeamId, activeTeamName, switchToPersonal } = useTeamStore();
  const { unreadCount } = useNotifications();

  // Prefetch all navigation routes on mount for instant navigation
  useEffect(() => {
    navItems.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [router]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase]);

  // Sync time when component mounts or tab becomes visible
  useEffect(() => {
    syncTime();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncTime();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [syncTime]);

  // Timer tick
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      tick();
    }, TIMER_INTERVALS.TICK);

    return () => clearInterval(interval);
  }, [isRunning, tick]);

  // Check if timer completed
  useEffect(() => {
    if (timeRemaining === 0 && isRunning) {
      useTimerStore.getState().setIsRunning(false);
      setIsAlarmPlaying(true);
    }
  }, [timeRemaining, isRunning, setIsAlarmPlaying]);

  // Update document title
  useEffect(() => {
    if (isRunning || timeRemaining !== totalTime) {
      document.title = `${formatTime(timeRemaining)} - ${APP_CONFIG.name}`;
    } else {
      document.title = APP_CONFIG.name;
    }
  }, [timeRemaining, isRunning, totalTime]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const showTimer = isRunning || timeRemaining !== totalTime;

  return (
    <>
      {/* Desktop top navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-8">
              {/* Logo */}
              <Link href="/timer" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">{APP_CONFIG.name}</span>
              </Link>

              <div className="hidden sm:flex items-center gap-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                        ${isActive
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {/* Mode indicator */}
              {mode === 'team' && activeTeamId && activeTeamName && (
                <button
                  onClick={() => {
                    switchToPersonal();
                    router.push('/teams');
                  }}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                  title={`${activeTeamName} - Click to exit team mode`}
                >
                  <TeamsIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="sm:hidden">{getTeamInitials(activeTeamName)}</span>
                  <span className="hidden sm:inline">{activeTeamName.length > 15 ? getTeamInitials(activeTeamName) : activeTeamName}</span>
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {/* Notifications */}
              {unreadCount > 0 && (
                <Link
                  href="/teams"
                  className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold"
                  title={`${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Link>
              )}

              {/* Timer display in navbar */}
              {showTimer && pathname !== '/timer' && (
                <Link
                  href="/timer"
                  className={`
                    hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-mono font-medium
                    ${isRunning
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }
                  `}
                >
                  <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                  {formatTime(timeRemaining)}
                </Link>
              )}

              {user && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">
                    {user.email}
                  </span>
                  {user.user_metadata?.avatar_url && (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <button
                    onClick={handleSignOut}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile bottom navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
        {/* Timer bar above mobile nav */}
        {showTimer && pathname !== '/timer' && (
          <Link
            href="/timer"
            className={`
              flex items-center justify-center gap-2 py-2 text-sm font-mono font-medium border-b border-gray-200 dark:border-gray-700
              ${isRunning
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
              }
            `}
          >
            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            {formatTime(timeRemaining)}
          </Link>
        )}

        <div className="flex justify-around items-center py-2 px-4" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const isTeams = item.href === '/teams';
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  relative flex flex-col items-center justify-center gap-1 py-2 px-3 text-xs font-medium transition-colors min-w-[60px]
                  ${isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400'
                  }
                `}
              >
                <div className="relative">
                  <item.icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
                  {isTeams && unreadCount > 0 && (
                    <span className="absolute -top-1 -left-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

function TimerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function TasksIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function NotesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function TeamsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}
