// =============================================================================
// APP CONFIGURATION
// =============================================================================

export const APP_CONFIG = {
  name: 'Tempo.io',
  tagline: 'Find your rhythm, never let it slip',
  description: 'The all-in-one productivity suite that helps you focus, plan, and achieve your goals.',
  storagePrefix: 'tempo',  // Used for localStorage keys
} as const;

// =============================================================================
// TIMER CONFIGURATION
// =============================================================================

export const TIMER_DURATIONS = {
  POMODORO: 25 * 60,      // 25 minutes in seconds
  SHORT_BREAK: 5 * 60,    // 5 minutes in seconds
  LONG_BREAK: 15 * 60,    // 15 minutes in seconds
  FOCUS: 45 * 60,         // 45 minutes in seconds
  DEEP_WORK: 90 * 60,     // 90 minutes in seconds
  DEFAULT: 25 * 60,       // Default timer value
} as const;

export const TIMER_PRESETS = [
  { name: 'Pomodoro', duration: TIMER_DURATIONS.POMODORO, icon: '🍅' },
  { name: 'Short Break', duration: TIMER_DURATIONS.SHORT_BREAK, icon: '☕' },
  { name: 'Long Break', duration: TIMER_DURATIONS.LONG_BREAK, icon: '🌴' },
  { name: 'Focus', duration: TIMER_DURATIONS.FOCUS, icon: '🎯' },
  { name: 'Deep Work', duration: TIMER_DURATIONS.DEEP_WORK, icon: '🧠' },
] as const;

export const TIMER_INTERVALS = {
  TICK: 1000,             // Timer tick interval (1 second)
  ALARM_BEEP: 2000,       // Alarm beep interval (2 seconds)
} as const;

// =============================================================================
// TIME CONVERSION CONSTANTS
// =============================================================================

export const TIME_UNITS = {
  SECONDS_PER_MINUTE: 60,
  SECONDS_PER_HOUR: 3600,
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24,
  DAYS_PER_MONTH: 30,
} as const;

// =============================================================================
// RATE LIMITING CONFIGURATION
// =============================================================================

export const RATE_LIMIT = {
  // API rate limiting
  API: {
    INTERVAL: 60 * 1000,        // 1 minute in milliseconds
    MAX_REQUESTS: 60,           // Max requests per interval
    MAX_TOKENS: 500,            // Max unique tokens to track
  },
  // Authentication rate limiting
  AUTH: {
    INTERVAL: 15 * 60 * 1000,   // 15 minutes in milliseconds
    MAX_REQUESTS: 100,          // Max auth requests per interval
  },
  // Default values
  DEFAULT: {
    INTERVAL: 60000,            // 60 seconds
    MAX_TOKENS: 500,
    REQUESTS_PER_MINUTE: 10,
  },
  // Response
  RETRY_AFTER_SECONDS: 60,
} as const;

// =============================================================================
// COOKIE CONFIGURATION
// =============================================================================

export const COOKIE_CONFIG = {
  GOOGLE_ACCESS_TOKEN_MAX_AGE: 60 * 60,           // 1 hour in seconds
  GOOGLE_REFRESH_TOKEN_MAX_AGE: 60 * 60 * 24 * 30, // 30 days in seconds
} as const;

// =============================================================================
// SWR CACHING CONFIGURATION
// =============================================================================

export const SWR_CONFIG = {
  DEDUPING_INTERVAL: 5000,      // 5 seconds
  ERROR_RETRY_COUNT: 2,
  CALENDAR_DEDUPING_INTERVAL: 30000, // 30 seconds for calendar
} as const;

// =============================================================================
// UI TIMING CONFIGURATION
// =============================================================================

export const UI_TIMING = {
  // Debounce/throttle
  AUTO_SAVE_DEBOUNCE: 1000,     // 1 second
  CLICK_OUTSIDE_DELAY: 100,     // 100ms

  // Toast notifications
  TOAST_DURATION: 4000,         // 4 seconds

  // Navigation progress
  NAV_PROGRESS_RESET: 200,      // 200ms
  NAV_PROGRESS_INTERVAL: 100,   // 100ms
  NAV_PROGRESS_INITIAL: 30,     // 30%
  NAV_PROGRESS_CAP: 90,         // 90%
  NAV_PROGRESS_INCREMENT: 10,   // 10%

  // Drag and drop
  DRAG_ACTIVATION_DELAY: 200,   // 200ms
  DRAG_ACTIVATION_TOLERANCE: 5, // 5px
} as const;

// =============================================================================
// ANIMATION CONFIGURATION
// =============================================================================

export const ANIMATION_TIMING = {
  // Durations (in seconds for framer-motion)
  FADE_DURATION: 0.4,
  SMOOTH_DURATION: 0.2,
  SLOW_DURATION: 0.4,
  FLOAT_DURATION: 3,
  CONFETTI_DURATION: 2,
  GRADIENT_SPIN_DURATION: 3,
  SHIMMER_DURATION: 2,

  // Delays
  STAGGER_DELAY: 0.05,
  TASK_STAGGER_DELAY: 0.1,
  CALENDAR_STAGGER_DELAY: 0.01,
  EVENT_STAGGER_DELAY: 0.05,
  CONFETTI_MAX_DELAY: 0.5,

  // Offsets (in pixels)
  FADE_OFFSET: 24,
  ANIMATED_NUMBER_OFFSET: -10,
  FLOAT_DISTANCE: 10,
  HOVER_Y_OFFSET: -2,

  // Scales
  SCALE_HOVER: 1.02,
  SCALE_TAP: 0.98,
  SCALE_HOVER_BUTTON: 1.05,
  SCALE_TAP_BUTTON: 0.95,
  SCALE_IN_INITIAL: 0.9,

  // Spring configs
  SPRING_STIFFNESS: 300,
  SPRING_DAMPING: 30,
  BOUNCE_STIFFNESS: 400,
  BOUNCE_DAMPING: 10,

  // Easing
  EASE_CURVE: [0.25, 0.4, 0.25, 1],
} as const;

export const ANIMATION_VARIANTS = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  fadeInUp: {
    initial: { opacity: 0, y: ANIMATION_TIMING.FADE_OFFSET },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -ANIMATION_TIMING.FADE_OFFSET },
  },
  fadeInDown: {
    initial: { opacity: 0, y: -ANIMATION_TIMING.FADE_OFFSET },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: ANIMATION_TIMING.FADE_OFFSET },
  },
  scaleIn: {
    initial: { opacity: 0, scale: ANIMATION_TIMING.SCALE_IN_INITIAL },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: ANIMATION_TIMING.SCALE_IN_INITIAL },
  },
  slideInRight: {
    initial: { opacity: 0, x: ANIMATION_TIMING.FADE_OFFSET },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -ANIMATION_TIMING.FADE_OFFSET },
  },
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: ANIMATION_TIMING.STAGGER_DELAY,
      },
    },
  },
} as const;

export const TRANSITIONS = {
  spring: {
    type: 'spring',
    stiffness: ANIMATION_TIMING.SPRING_STIFFNESS,
    damping: ANIMATION_TIMING.SPRING_DAMPING,
  },
  smooth: {
    type: 'tween',
    ease: 'easeOut',
    duration: ANIMATION_TIMING.SMOOTH_DURATION,
  },
  bounce: {
    type: 'spring',
    stiffness: ANIMATION_TIMING.BOUNCE_STIFFNESS,
    damping: ANIMATION_TIMING.BOUNCE_DAMPING,
  },
  slow: {
    type: 'tween',
    ease: 'easeInOut',
    duration: ANIMATION_TIMING.SLOW_DURATION,
  },
} as const;

// =============================================================================
// COLOR CONFIGURATION
// =============================================================================

export const COLORS = {
  // Hex colors
  HEX: {
    BLUE: '#3b82f6',
    RED: '#ef4444',
    GREEN: '#22c55e',
    YELLOW: '#eab308',
    PURPLE: '#a855f7',
    PINK: '#ec4899',
    INDIGO: '#6366f1',
    TEAL: '#14b8a6',
    CYAN: '#06b6d4',
    GRAY: '#6b7280',
  },

  // Color opacity for backgrounds
  BG_OPACITY: 0.15,
  GLOW_OPACITY: 0.25,
  HOVER_BG_OPACITY: 0.05,
} as const;

export const COLOR_PALETTE = [
  { id: 'blue', bg: 'bg-blue-500', hex: COLORS.HEX.BLUE, name: 'Blue' },
  { id: 'red', bg: 'bg-red-500', hex: COLORS.HEX.RED, name: 'Red' },
  { id: 'green', bg: 'bg-green-500', hex: COLORS.HEX.GREEN, name: 'Green' },
  { id: 'yellow', bg: 'bg-yellow-500', hex: COLORS.HEX.YELLOW, name: 'Yellow' },
  { id: 'purple', bg: 'bg-purple-500', hex: COLORS.HEX.PURPLE, name: 'Purple' },
  { id: 'pink', bg: 'bg-pink-500', hex: COLORS.HEX.PINK, name: 'Pink' },
  { id: 'indigo', bg: 'bg-indigo-500', hex: COLORS.HEX.INDIGO, name: 'Indigo' },
  { id: 'teal', bg: 'bg-teal-500', hex: COLORS.HEX.TEAL, name: 'Teal' },
] as const;

export const CONFETTI_COLORS = [
  COLORS.HEX.BLUE,
  COLORS.HEX.GREEN,
  COLORS.HEX.YELLOW,
  COLORS.HEX.PINK,
  COLORS.HEX.PURPLE,
] as const;

// =============================================================================
// PROJECT/KANBAN CONFIGURATION
// =============================================================================

export const PROJECT_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-yellow-500',
  'bg-red-500',
  'bg-indigo-500',
  'bg-cyan-500',
] as const;

export const STATUS_ICONS = [
  '📋', '🔨', '✅', '🎯', '🚀', '⏳', '🔍', '📝', '💡', '⭐', '🎨', '🔧',
] as const;

export const DEFAULT_STATUSES = [
  { name: 'Planning', icon: '📋', color: 'bg-gray-100 dark:bg-gray-800', position: 0 },
  { name: 'In Progress', icon: '🔨', color: 'bg-blue-50 dark:bg-blue-900/20', position: 1 },
  { name: 'Done', icon: '✅', color: 'bg-green-50 dark:bg-green-900/20', position: 2 },
] as const;

export const KANBAN_COLUMNS = [
  { id: 'planning', title: 'Planning', icon: '📋' },
  { id: 'doing', title: 'In Progress', icon: '🔨' },
  { id: 'done', title: 'Done', icon: '✅' },
] as const;

// =============================================================================
// PRIORITY CONFIGURATION
// =============================================================================

export const PRIORITY_STYLES = {
  low: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
} as const;

// =============================================================================
// TIMELINE CONFIGURATION
// =============================================================================

export const TIMELINE_CONFIG = {
  HOURS_IN_DAY: TIME_UNITS.HOURS_PER_DAY,
  PIXELS_PER_HOUR: 60,
  DEFAULT_SCROLL_HOUR: 8,
  MIN_EVENT_HEIGHT: 20,
  DEFAULT_EVENT_HEIGHT: 60,
} as const;

// =============================================================================
// UI SIZING CONFIGURATION
// =============================================================================

export const UI_SIZES = {
  // Circular progress
  CIRCULAR_PROGRESS_SIZE: 320,
  CIRCULAR_PROGRESS_STROKE: 8,
  CIRCULAR_PROGRESS_RADIUS_OFFSET: 20,

  // Confetti
  CONFETTI_PARTICLE_COUNT: 50,

  // Z-indexes
  Z_INDEX: {
    TOAST: 100,
    NAVIGATION_PROGRESS: 200,
    MODAL: 50,
  },
} as const;

// =============================================================================
// WEEK DAYS
// =============================================================================

export const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const WEEK_DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

// =============================================================================
// NAVIGATION ROUTES
// =============================================================================

export const NAV_ROUTES = [
  { href: '/timer', label: 'Timer' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/notes', label: 'Notes' },
] as const;

export const ALLOWED_REDIRECT_PATHS = ['/timer', '/calendar', '/tasks', '/notes'] as const;

// =============================================================================
// HTTP STATUS CODES
// =============================================================================

export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// =============================================================================
// CALENDAR CONFIGURATION
// =============================================================================

export const CALENDAR_COLORS = [
  { id: 'blue', bg: 'bg-blue-500', name: 'Blue' },
  { id: 'red', bg: 'bg-red-500', name: 'Red' },
  { id: 'green', bg: 'bg-green-500', name: 'Green' },
  { id: 'yellow', bg: 'bg-yellow-500', name: 'Yellow' },
  { id: 'purple', bg: 'bg-purple-500', name: 'Purple' },
  { id: 'pink', bg: 'bg-pink-500', name: 'Pink' },
] as const;

// =============================================================================
// EDITOR CONFIGURATION
// =============================================================================

export const EDITOR_CONFIG = {
  BG_COLOR_LIGHT: '#ffffff',
  BG_COLOR_DARK: '#1f2937',
} as const;

// =============================================================================
// LEGACY EXPORTS (for backwards compatibility)
// =============================================================================

// Keep the old COLORS export for backwards compatibility
export { COLOR_PALETTE as COLORS_LEGACY };
