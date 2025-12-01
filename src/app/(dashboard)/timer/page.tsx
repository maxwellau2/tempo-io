'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, Input, Confetti } from '@/components/ui';
import { CircularProgress, TimerDisplay, PresetButton } from '@/components/timer';
import { TIMER_PRESETS } from '@/lib/constants';
import { useTimerStore } from '@/stores/timerStore';
import { Button } from '@/components/ui';

export default function TimerPage() {
  const {
    timeRemaining,
    totalTime,
    isRunning,
    youtubeUrl,
    setTimeRemaining,
    setTotalTime,
    setIsRunning,
    setYoutubeUrl,
    selectPreset,
    reset,
    syncTime,
  } = useTimerStore();

  // Sync time on mount
  useEffect(() => {
    syncTime();
  }, [syncTime]);

  // Load YouTube API
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  const handleTimeChange = (seconds: number) => {
    setTimeRemaining(seconds);
    setTotalTime(seconds);
  };

  const progress = totalTime > 0 ? ((totalTime - timeRemaining) / totalTime) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-8"
    >
      <Confetti isActive={timeRemaining === 0 && !isRunning} />

      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-gray-900 dark:text-white"
      >
        Timer
      </motion.h1>

      {/* Timer Circle */}
      <Card className="p-8" glow>
        <CircularProgress progress={progress}>
          <TimerDisplay
            timeRemaining={timeRemaining}
            isRunning={isRunning}
            onTimeChange={handleTimeChange}
          />
        </CircularProgress>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-4 mt-6 justify-center"
        >
          <Button
            onClick={() => setIsRunning(!isRunning)}
            variant={isRunning ? 'secondary' : 'primary'}
            size="lg"
          >
            {isRunning ? 'Pause' : 'Start'}
          </Button>
          <Button
            onClick={reset}
            variant="ghost"
            size="lg"
          >
            Reset
          </Button>
        </motion.div>
      </Card>

      {/* Presets */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap gap-3 justify-center"
      >
        {TIMER_PRESETS.map((preset, index) => (
          <motion.div
            key={preset.name}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + index * 0.05 }}
          >
            <PresetButton
              name={preset.name}
              duration={preset.duration}
              icon={preset.icon}
              isActive={totalTime === preset.duration}
              onClick={() => selectPreset(preset.duration)}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* YouTube URL Input */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="p-6" hover>
          <Input
            label="Alarm Sound (YouTube URL)"
            placeholder="https://youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Leave empty to use default beep sound
          </p>
        </Card>
      </motion.div>

      {/* Hidden YouTube player */}
      <div id="youtube-player" className="hidden" />
    </motion.div>
  );
}
