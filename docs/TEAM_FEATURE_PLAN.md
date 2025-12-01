# Team Feature Plan

## Overview

Add team mode alongside personal mode. Users can create/join teams with shared calendar, tasks, and notes. Role-based access control with leader, admin, and member roles.

## Database Schema

### New Tables

```sql
-- Teams
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  invite_code text unique not null default nanoid(8),
  created_by uuid references auth.users(id) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Team membership with roles
create table team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('leader', 'admin', 'member')),
  joined_at timestamptz default now(),
  unique(team_id, user_id)
);

-- Join requests (user requests to join via team id)
create table team_join_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz default now(),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  unique(team_id, user_id)
);

-- Invitations (admin invites user)
create table team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade not null,
  invited_email text not null,
  invited_user_id uuid references auth.users(id),
  invited_by uuid references auth.users(id) not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz default now(),
  resolved_at timestamptz,
  unique(team_id, invited_email)
);

-- Notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null,
  title text not null,
  message text,
  data jsonb,
  read boolean default false,
  created_at timestamptz default now()
);

-- Team chat messages
create table team_messages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  type text not null default 'text' check (type in ('text', 'meet')),
  metadata jsonb,
  edited_at timestamptz,
  created_at timestamptz default now()
);

create index team_messages_team_id_created_at_idx on team_messages(team_id, created_at desc);
```

### Modified Tables

Add `team_id` to existing tables (nullable for personal items):

```sql
alter table projects add column team_id uuid references teams(id) on delete cascade;
alter table tasks add column team_id uuid references teams(id) on delete cascade;
alter table notes add column team_id uuid references teams(id) on delete cascade;
alter table events add column team_id uuid references teams(id) on delete cascade;

-- Indexes
create index projects_team_id_idx on projects(team_id);
create index tasks_team_id_idx on tasks(team_id);
create index notes_team_id_idx on notes(team_id);
create index events_team_id_idx on events(team_id);
```

### Row Level Security

```sql
-- Team visibility: members can see team data
create policy "Team members can view team"
  on teams for select
  using (id in (select team_id from team_members where user_id = auth.uid()));

-- Team projects: members can view, admins+ can edit
create policy "Team members can view team projects"
  on projects for select
  using (
    team_id is null and user_id = auth.uid()
    or team_id in (select team_id from team_members where user_id = auth.uid())
  );

create policy "Team admins can modify team projects"
  on projects for all
  using (
    team_id is null and user_id = auth.uid()
    or team_id in (
      select team_id from team_members
      where user_id = auth.uid() and role in ('leader', 'admin')
    )
  );

-- Similar policies for tasks, notes, events
```

## Types

```typescript
type TeamRole = 'leader' | 'admin' | 'member';
type RequestStatus = 'pending' | 'accepted' | 'rejected';

interface Team {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
  profile?: Profile;
}

interface TeamJoinRequest {
  id: string;
  team_id: string;
  user_id: string;
  status: RequestStatus;
  created_at: string;
  resolved_by: string | null;
  resolved_at: string | null;
  profile?: Profile;
}

interface TeamInvitation {
  id: string;
  team_id: string;
  invited_email: string;
  invited_user_id: string | null;
  invited_by: string;
  status: RequestStatus;
  created_at: string;
  resolved_at: string | null;
  team?: Team;
}

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  data: Record<string, any> | null;
  read: boolean;
  created_at: string;
}

type MessageType = 'text' | 'meet';

interface TeamMessage {
  id: string;
  team_id: string;
  user_id: string;
  content: string;
  type: MessageType;
  metadata: { meet_link?: string } | null;
  edited_at: string | null;
  created_at: string;
  profile?: Profile;
}
```

## UI Components

### Mode Toggle
- Global toggle in navbar: Personal / Team
- Persisted in localStorage/zustand
- When in team mode, show team selector dropdown

### Team Management Pages

`/teams` - Team list and creation
- List user's teams
- Create team button
- Join team by ID button

`/teams/[id]` - Team dashboard
- Team name, description
- Member list with roles
- Pending join requests (admin+)
- Invite member (admin+)
- Team settings (leader only)
- Leave team / Delete team

`/teams/[id]/chat` - Team chat
- Real-time message list (Supabase Realtime)
- Message input with send button
- Shows sender name/avatar, timestamp
- Edit/delete own messages
- Auto-scroll to latest, load older on scroll up
- "Start Call" button - generates Google Meet link and posts to chat

### Notifications
- Bell icon in navbar with unread count
- Dropdown showing recent notifications
- Types: team_invitation, join_request_accepted, join_request_rejected, removed_from_team

### Modified Existing Pages
- Tasks, Notes, Calendar filter by team_id when in team mode
- Show team indicator on shared items
- Project sidebar shows team projects when in team mode

## State Management

### New Zustand Store

```typescript
interface TeamStore {
  mode: 'personal' | 'team';
  activeTeamId: string | null;
  setMode: (mode: 'personal' | 'team') => void;
  setActiveTeam: (teamId: string | null) => void;
}
```

### New SWR Hooks

- `useTeams()` - user's teams
- `useTeam(id)` - single team with members
- `useTeamJoinRequests(teamId)` - pending requests
- `useTeamInvitations()` - user's pending invitations
- `useNotifications()` - user's notifications
- `useTeamMessages(teamId)` - chat messages with real-time subscription

## API Routes

```
POST   /api/teams              - create team
GET    /api/teams              - list user's teams
GET    /api/teams/[id]         - get team details
PATCH  /api/teams/[id]         - update team (leader)
DELETE /api/teams/[id]         - delete team (leader)

POST   /api/teams/[id]/join    - request to join
POST   /api/teams/[id]/leave   - leave team
GET    /api/teams/[id]/members - list members
DELETE /api/teams/[id]/members/[userId] - remove member (admin+)
PATCH  /api/teams/[id]/members/[userId] - change role (leader)

GET    /api/teams/[id]/requests - list join requests (admin+)
PATCH  /api/teams/[id]/requests/[requestId] - accept/reject (admin+)

POST   /api/teams/[id]/invite  - invite user (admin+)
GET    /api/invitations        - user's pending invitations
PATCH  /api/invitations/[id]   - accept/reject invitation

GET    /api/notifications      - list notifications
PATCH  /api/notifications/[id] - mark as read
POST   /api/notifications/read-all - mark all as read

GET    /api/teams/[id]/messages - list messages (paginated)
POST   /api/teams/[id]/messages - send message
PATCH  /api/teams/[id]/messages/[messageId] - edit message (own only)
DELETE /api/teams/[id]/messages/[messageId] - delete message (own or admin+)

POST   /api/teams/[id]/meet - create Google Meet and post link to chat
```

## Implementation Phases

### Phase 1: Database & Types
1. Create migration for new tables
2. Add team_id to existing tables
3. Set up RLS policies
4. Add TypeScript types

### Phase 2: Team CRUD
1. Create team store
2. Implement useTeams hook
3. Build /teams page
4. Build /teams/[id] page
5. Team creation flow

### Phase 3: Membership
1. Join request flow
2. Invitation flow
3. Member management UI
4. Role management

### Phase 4: Notifications
1. Notification table triggers
2. useNotifications hook
3. Notification bell UI
4. Real-time updates (Supabase realtime)

### Phase 5: Team Chat
1. team_messages table and RLS
2. useTeamMessages hook with Supabase Realtime subscription
3. Chat page UI with message list
4. Message input, send, edit, delete
5. Infinite scroll for history
6. Google Meet integration - uses Google Calendar API to create Meet link, posts as special message type

### Phase 6: Integration
1. Mode toggle in navbar
2. Filter existing queries by team_id
3. Team indicator on items
4. Test all flows

## Edge Cases

- User leaves team: their created items stay with team or get reassigned?
- Team deleted: cascade delete all team items
- Last admin leaves: auto-promote oldest member or block?
- User already in team tries to join again
- Invite sent to non-existent user email
- Rate limiting on join requests

## Future Considerations

- Activity feed
- Team-level permissions (who can create projects, etc.)
- Team billing (if monetizing)
- Team analytics
- Message reactions
- File/image attachments in chat
- @mentions in chat
- Typing indicators
