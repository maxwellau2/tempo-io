-- Function to lookup team ID by invite code (bypasses RLS)
-- This allows users to find a team to join without being a member

create or replace function get_team_id_by_invite_code(code text)
returns uuid as $$
declare
  team_id uuid;
begin
  select id into team_id
  from teams
  where invite_code = code;

  return team_id;
end;
$$ language plpgsql security definer stable set search_path = public;
