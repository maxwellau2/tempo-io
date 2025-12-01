# Tempo.io

Productivity suite with timer, tasks, notes, and calendar. Cloud synced via Supabase.

## Stack

- Next.js 16 (App Router)
- Supabase (Auth, Postgres)
- Zustand (client state)
- SWR (server state caching)
- TipTap (rich text editor)
- Framer Motion (animations)
- Tailwind CSS

## Structure

```
src/
  app/              # Routes and pages
    (dashboard)/    # Authenticated routes (timer, calendar, tasks, notes)
    api/            # API routes (google-token, debug)
    auth/           # OAuth callback
  components/       # UI components by feature
  hooks/            # Data fetching hooks (SWR-based)
  stores/           # Zustand stores
  lib/              # Utilities, Supabase clients, constants
  types/            # TypeScript definitions
```

## Setup

1. Copy `.env.example` to `.env.local`
2. Set up Supabase project and add credentials
3. Set up Google OAuth app for calendar integration
4. `npm install && npm run dev`

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Features

- Pomodoro timer with presets, persisted across sessions
- Kanban boards with customizable statuses per project
- Rich text notes with auto-save
- Google Calendar integration (read/write)
- SWR caching for instant navigation

## Future Ideas

- Offline support with service worker
- Mobile app (React Native or PWA)
- Recurring tasks
- Time tracking / analytics dashboard
- Team collaboration features
- Keyboard shortcuts
- Import/export data
- Custom themes
