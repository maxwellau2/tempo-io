'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTimerStore } from '@/stores/timerStore';
import { Button } from '@/components/ui';
import { TIMER_INTERVALS } from '@/lib/constants';

export function AlarmModal() {
  const { isAlarmPlaying, setIsAlarmPlaying, youtubeUrl, selectPreset, totalTime } = useTimerStore();
  const playerRef = useRef<YT.Player | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const extractVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const stopAlarm = useCallback(() => {
    // Stop YouTube player
    if (playerRef.current) {
      try {
        playerRef.current.stopVideo();
        playerRef.current.destroy();
      } catch (e) {
        // Ignore errors
      }
      playerRef.current = null;
    }

    // Clear alarm interval
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // Ignore errors
      }
      audioContextRef.current = null;
    }
  }, []);

  const playAlarm = useCallback(() => {
    const videoId = extractVideoId(youtubeUrl);

    if (videoId && typeof window !== 'undefined' && window.YT) {
      // Create player container if it doesn't exist
      let playerDiv = document.getElementById('youtube-player-global');
      if (!playerDiv) {
        playerDiv = document.createElement('div');
        playerDiv.id = 'youtube-player-global';
        playerDiv.style.display = 'none';
        document.body.appendChild(playerDiv);
      }

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // Ignore
        }
      }

      playerRef.current = new window.YT.Player('youtube-player-global', {
        height: '0',
        width: '0',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          loop: 1,
          playlist: videoId,
        } as YT.PlayerVars,
        events: {
          onReady: (event: YT.PlayerEvent) => {
            event.target.playVideo();
          },
          onStateChange: (event: YT.OnStateChangeEvent) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              event.target.playVideo();
            }
          },
        },
      });
    } else {
      // Fallback: repeating beep sound
      const playBeep = () => {
        try {
          const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          audioContextRef.current = audioContext;
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          gainNode.gain.value = 0.3;

          oscillator.start();
          setTimeout(() => {
            oscillator.stop();
          }, 500);
        } catch (e) {
          // Ignore errors
        }
      };

      playBeep();
      alarmIntervalRef.current = setInterval(playBeep, TIMER_INTERVALS.ALARM_BEEP);
    }
  }, [youtubeUrl]);

  // Start alarm when isAlarmPlaying becomes true
  useEffect(() => {
    if (isAlarmPlaying) {
      playAlarm();
    } else {
      stopAlarm();
    }

    return () => {
      stopAlarm();
    };
  }, [isAlarmPlaying, playAlarm, stopAlarm]);

  const handleDismiss = () => {
    stopAlarm();
    setIsAlarmPlaying(false);
    selectPreset(totalTime);
  };

  const handleSnooze = (minutes: number) => {
    stopAlarm();
    setIsAlarmPlaying(false);
    selectPreset(minutes * 60);
    // Start the timer after a brief delay
    setTimeout(() => {
      useTimerStore.getState().setIsRunning(true);
    }, 100);
  };

  return (
    <AnimatePresence>
      {isAlarmPlaying && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4 text-center"
          >
            {/* Pulsing alarm icon */}
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center"
            >
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </motion.div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Time's Up!
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Great work! Take a break or keep going.
            </p>

            <div className="space-y-3">
              <Button
                onClick={handleDismiss}
                className="w-full"
                size="lg"
              >
                Dismiss
              </Button>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleSnooze(5)}
                  variant="secondary"
                  className="flex-1"
                >
                  +5 min
                </Button>
                <Button
                  onClick={() => handleSnooze(10)}
                  variant="secondary"
                  className="flex-1"
                >
                  +10 min
                </Button>
                <Button
                  onClick={() => handleSnooze(15)}
                  variant="secondary"
                  className="flex-1"
                >
                  +15 min
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
