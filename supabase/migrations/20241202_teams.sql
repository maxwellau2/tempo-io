-- Profiles table (for user display names and avatars)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on profiles for select
  using (true);

create policy "Users can update own profile"
  on profiles for update
  using (id = auth.uid());

create policy "Users can insert own profile"
  on profiles for insert
  with check (id = auth.uid());

-- Allow service role / triggers to insert profiles
create policy "Service role can insert profiles"
  on profiles for insert
  with check (true);

-- Auto-create profile on user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
exception when others then
  -- Log error but don't fail user creation
  raise warning 'Could not create profile for user %: %', new.id, sqlerrm;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Backfill existing users
insert into profiles (id, display_name, avatar_url)
select
  id,
  coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
  raw_user_meta_data->>'avatar_url'
from auth.users
on conflict (id) do nothing;

-- Teams
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  invite_code text unique not null default substr(md5(random()::text), 1, 8),
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
  type text not null default 'text' check (type in ('text', 'meet', 'link')),
  metadata jsonb,
  edited_at timestamptz,
  created_at timestamptz default now()
);

-- Team calendar events
create table team_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  is_all_day boolean default false,
  color text default 'bg-blue-500',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index team_messages_team_id_created_at_idx on team_messages(team_id, created_at desc);
create index team_events_team_id_start_time_idx on team_events(team_id, start_time);
create index notifications_user_id_created_at_idx on notifications(user_id, created_at desc);
create index team_members_user_id_idx on team_members(user_id);
create index team_join_requests_team_id_status_idx on team_join_requests(team_id, status);
create index team_invitations_invited_user_id_idx on team_invitations(invited_user_id);

-- Add team_id to existing tables
alter table projects add column if not exists team_id uuid references teams(id) on delete cascade;
alter table tasks add column if not exists team_id uuid references teams(id) on delete cascade;
alter table notes add column if not exists team_id uuid references teams(id) on delete cascade;

create index if not exists projects_team_id_idx on projects(team_id);
create index if not exists tasks_team_id_idx on tasks(team_id);
create index if not exists notes_team_id_idx on notes(team_id);

-- Helper functions to avoid RLS recursion
create or replace function auth_user_team_ids()
returns setof uuid as $$
  select team_id from public.team_members where user_id = auth.uid()
$$ language sql security definer stable set search_path = public;

create or replace function auth_user_admin_team_ids()
returns setof uuid as $$
  select team_id from public.team_members where user_id = auth.uid() and role in ('leader', 'admin')
$$ language sql security definer stable set search_path = public;

create or replace function auth_user_leader_team_ids()
returns setof uuid as $$
  select team_id from public.team_members where user_id = auth.uid() and role = 'leader'
$$ language sql security definer stable set search_path = public;

-- RLS Policies

-- Teams
alter table teams enable row level security;

create policy "Anyone authenticated can create teams"
  on teams for insert
  to authenticated
  with check (true);

create policy "Team members can view team"
  on teams for select
  using (id in (select auth_user_team_ids()) or created_by = auth.uid());

create policy "Team leader can update team"
  on teams for update
  using (id in (select auth_user_leader_team_ids()));

create policy "Team leader can delete team"
  on teams for delete
  using (id in (select auth_user_leader_team_ids()));

-- Team members
alter table team_members enable row level security;

create policy "Team members can view members"
  on team_members for select
  using (team_id in (select auth_user_team_ids()));

create policy "Team admins can add members"
  on team_members for insert
  with check (
    team_id in (select auth_user_admin_team_ids())
    or (role = 'leader' and user_id = auth.uid())
  );

-- Allow users to add themselves when accepting an invitation
create policy "Users can join via invitation"
  on team_members for insert
  with check (
    user_id = auth.uid()
    and role = 'member'
    and exists (
      select 1 from team_invitations
      where team_invitations.team_id = team_members.team_id
      and (team_invitations.invited_user_id = auth.uid() or team_invitations.invited_email = auth.email())
      and team_invitations.status = 'pending'
    )
  );

create policy "Team admins can remove members"
  on team_members for delete
  using (team_id in (select auth_user_admin_team_ids()) or user_id = auth.uid());

create policy "Team leader can update roles"
  on team_members for update
  using (team_id in (select auth_user_leader_team_ids()));

-- Join requests
alter table team_join_requests enable row level security;

create policy "Users can view own join requests"
  on team_join_requests for select
  using (user_id = auth.uid() or team_id in (select auth_user_admin_team_ids()));

create policy "Users can create join requests"
  on team_join_requests for insert
  with check (user_id = auth.uid());

create policy "Team admins can update join requests"
  on team_join_requests for update
  using (team_id in (select auth_user_admin_team_ids()));

-- Invitations
alter table team_invitations enable row level security;

create policy "Users can view own invitations"
  on team_invitations for select
  using (invited_user_id = auth.uid() or invited_email = auth.email() or team_id in (select auth_user_admin_team_ids()));

create policy "Team admins can create invitations"
  on team_invitations for insert
  with check (team_id in (select auth_user_admin_team_ids()));

create policy "Users can update own invitations"
  on team_invitations for update
  using (invited_user_id = auth.uid() or invited_email = auth.email());

create policy "Team admins can delete invitations"
  on team_invitations for delete
  using (team_id in (select auth_user_admin_team_ids()));

-- Notifications
alter table notifications enable row level security;

create policy "Users can view own notifications"
  on notifications for select
  using (user_id = auth.uid());

create policy "Users can update own notifications"
  on notifications for update
  using (user_id = auth.uid());

create policy "Users can delete own notifications"
  on notifications for delete
  using (user_id = auth.uid());

-- Team messages
alter table team_messages enable row level security;

create policy "Team members can view messages"
  on team_messages for select
  using (team_id in (select auth_user_team_ids()));

create policy "Team members can send messages"
  on team_messages for insert
  with check (team_id in (select auth_user_team_ids()) and user_id = auth.uid());

create policy "Users can edit own messages"
  on team_messages for update
  using (user_id = auth.uid());

create policy "Users can delete own messages or admins can delete any"
  on team_messages for delete
  using (user_id = auth.uid() or team_id in (select auth_user_admin_team_ids()));

-- Team events
alter table team_events enable row level security;

create policy "Team members can view events"
  on team_events for select
  using (team_id in (select auth_user_team_ids()));

create policy "Team members can create events"
  on team_events for insert
  with check (team_id in (select auth_user_team_ids()) and user_id = auth.uid());

create policy "Team members can update events"
  on team_events for update
  using (team_id in (select auth_user_team_ids()));

create policy "Users can delete own events or admins can delete any"
  on team_events for delete
  using (user_id = auth.uid() or team_id in (select auth_user_admin_team_ids()));

-- Update projects RLS to include team access
drop policy if exists "Users can view own projects" on projects;
drop policy if exists "Users can view own or team projects" on projects;
create policy "Users can view own or team projects"
  on projects for select
  using (user_id = auth.uid() or team_id in (select auth_user_team_ids()));

drop policy if exists "Users can insert own projects" on projects;
drop policy if exists "Users can insert own or team projects" on projects;
create policy "Users can insert own or team projects"
  on projects for insert
  with check (user_id = auth.uid() and (team_id is null or team_id in (select auth_user_team_ids())));

drop policy if exists "Users can update own projects" on projects;
drop policy if exists "Users can update own or team projects" on projects;
create policy "Users can update own or team projects"
  on projects for update
  using (user_id = auth.uid() or team_id in (select auth_user_team_ids()));

drop policy if exists "Users can delete own projects" on projects;
drop policy if exists "Users can delete own or team projects" on projects;
create policy "Users can delete own or team projects"
  on projects for delete
  using (user_id = auth.uid() or team_id in (select auth_user_admin_team_ids()));

-- Update tasks RLS to include team access
drop policy if exists "Users can view own tasks" on tasks;
drop policy if exists "Users can view own or team tasks" on tasks;
create policy "Users can view own or team tasks"
  on tasks for select
  using (user_id = auth.uid() or team_id in (select auth_user_team_ids()));

drop policy if exists "Users can insert own tasks" on tasks;
drop policy if exists "Users can insert own or team tasks" on tasks;
create policy "Users can insert own or team tasks"
  on tasks for insert
  with check (user_id = auth.uid() and (team_id is null or team_id in (select auth_user_team_ids())));

drop policy if exists "Users can update own tasks" on tasks;
drop policy if exists "Users can update own or team tasks" on tasks;
create policy "Users can update own or team tasks"
  on tasks for update
  using (user_id = auth.uid() or team_id in (select auth_user_team_ids()));

drop policy if exists "Users can delete own tasks" on tasks;
drop policy if exists "Users can delete own or team tasks" on tasks;
create policy "Users can delete own or team tasks"
  on tasks for delete
  using (user_id = auth.uid() or team_id in (select auth_user_team_ids()));

-- Update notes RLS to include team access
drop policy if exists "Users can view own notes" on notes;
drop policy if exists "Users can view own or team notes" on notes;
create policy "Users can view own or team notes"
  on notes for select
  using (user_id = auth.uid() or team_id in (select auth_user_team_ids()));

drop policy if exists "Users can insert own notes" on notes;
drop policy if exists "Users can insert own or team notes" on notes;
create policy "Users can insert own or team notes"
  on notes for insert
  with check (user_id = auth.uid() and (team_id is null or team_id in (select auth_user_team_ids())));

drop policy if exists "Users can update own notes" on notes;
drop policy if exists "Users can update own or team notes" on notes;
create policy "Users can update own or team notes"
  on notes for update
  using (user_id = auth.uid() or team_id in (select auth_user_team_ids()));

drop policy if exists "Users can delete own notes" on notes;
drop policy if exists "Users can delete own or team notes" on notes;
create policy "Users can delete own or team notes"
  on notes for delete
  using (user_id = auth.uid() or team_id in (select auth_user_team_ids()));

-- Function to auto-add creator as leader when team is created
create or replace function add_team_creator_as_leader()
returns trigger as $$
begin
  insert into public.team_members (team_id, user_id, role)
  values (new.id, new.created_by, 'leader');
  return new;
exception when others then
  raise warning 'Could not add team creator as leader: %', sqlerrm;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_team_created on teams;
create trigger on_team_created
  after insert on teams
  for each row execute function add_team_creator_as_leader();

-- Function to create notification
create or replace function create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text default null,
  p_data jsonb default null
)
returns uuid as $$
declare
  v_id uuid;
begin
  insert into notifications (user_id, type, title, message, data)
  values (p_user_id, p_type, p_title, p_message, p_data)
  returning id into v_id;
  return v_id;
end;
$$ language plpgsql security definer;
