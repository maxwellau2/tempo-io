import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TIMER_DURATIONS, APP_CONFIG, TIMER_INTERVALS } from '@/lib/constants';

interface TimerState {
  timeRemaining: number;
  totalTime: number;
  isRunning: boolean;
  isAlarmPlaying: boolean;
  youtubeUrl: string;
  lastTick: number; // To calculate elapsed time when returning to tab

  // Actions
  setTimeRemaining: (time: number) => void;
  setTotalTime: (time: number) => void;
  setIsRunning: (running: boolean) => void;
  setIsAlarmPlaying: (playing: boolean) => void;
  setYoutubeUrl: (url: string) => void;
  selectPreset: (duration: number) => void;
  reset: () => void;
  tick: () => void;
  syncTime: () => void; // Sync time based on elapsed time since last tick
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      timeRemaining: TIMER_DURATIONS.DEFAULT,
      totalTime: TIMER_DURATIONS.DEFAULT,
      isRunning: false,
      isAlarmPlaying: false,
      youtubeUrl: '',
      lastTick: Date.now(),

      setTimeRemaining: (time) => set({ timeRemaining: time, lastTick: Date.now() }),
      setTotalTime: (time) => set({ totalTime: time }),
      setIsRunning: (running) => set({ isRunning: running, lastTick: Date.now() }),
      setIsAlarmPlaying: (playing) => set({ isAlarmPlaying: playing }),
      setYoutubeUrl: (url) => set({ youtubeUrl: url }),

      selectPreset: (duration) => set({
        timeRemaining: duration,
        totalTime: duration,
        isRunning: false,
        lastTick: Date.now(),
      }),

      reset: () => set((state) => ({
        timeRemaining: state.totalTime,
        isRunning: false,
        lastTick: Date.now(),
      })),

      tick: () => set((state) => {
        if (state.isRunning && state.timeRemaining > 0) {
          return {
            timeRemaining: state.timeRemaining - 1,
            lastTick: Date.now(),
          };
        }
        return state;
      }),

      // Sync time when tab becomes visible or component mounts
      syncTime: () => set((state) => {
        if (!state.isRunning) return state;

        const now = Date.now();
        const elapsedSeconds = Math.floor((now - state.lastTick) / TIMER_INTERVALS.TICK);
        const newTimeRemaining = Math.max(0, state.timeRemaining - elapsedSeconds);

        return {
          timeRemaining: newTimeRemaining,
          lastTick: now,
        };
      }),
    }),
    {
      name: `${APP_CONFIG.storagePrefix}-timer`,
      partialize: (state) => ({
        timeRemaining: state.timeRemaining,
        totalTime: state.totalTime,
        isRunning: state.isRunning,
        youtubeUrl: state.youtubeUrl,
        lastTick: state.lastTick,
      }),
    }
  )
);
