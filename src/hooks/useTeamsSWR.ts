'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Team, TeamMember, TeamWithMembers, TeamJoinRequest, TeamInvitation, Profile } from '@/types';

const TEAMS_KEY = 'teams';
const TEAM_KEY = (id: string) => `team-${id}`;
const JOIN_REQUESTS_KEY = (teamId: string) => `team-${teamId}-requests`;
const INVITATIONS_KEY = 'invitations';

async function fetchTeams(): Promise<Team[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('team_members' as any)
    .select('team_id, teams(*)')
    .eq('user_id', user.id);

  if (error) throw error;
  return (data || []).map((row: any) => row.teams);
}

async function fetchTeam(teamId: string): Promise<TeamWithMembers | null> {
  const supabase = createClient();

  const { data: team, error: teamError } = await supabase
    .from('teams' as any)
    .select('*')
    .eq('id', teamId)
    .single();

  if (teamError) throw teamError;
  if (!team) return null;

  let members: any[] = [];

  // Try with profiles join first
  const { data, error } = await supabase
    .from('team_members' as any)
    .select('*, profiles(id, display_name, avatar_url)')
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true });

  if (!error && data) {
    members = data.map((m: any) => ({
      ...m,
      profile: m.profiles,
    }));
  } else {
    // Fallback without profiles join
    const { data: fallbackData } = await supabase
      .from('team_members' as any)
      .select('*')
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true });
    members = fallbackData || [];
  }

  return { ...(team as Team), members } as TeamWithMembers;
}

async function fetchJoinRequests(teamId: string): Promise<TeamJoinRequest[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('team_join_requests' as any)
    .select('*')
    .eq('team_id', teamId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as TeamJoinRequest[];
}

async function fetchInvitations(): Promise<TeamInvitation[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('team_invitations' as any)
    .select('*, teams(*)')
    .or(`invited_user_id.eq.${user.id},invited_email.eq.${user.email}`)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((i: any) => ({
    ...i,
    team: i.teams,
  }));
}

export function useTeams() {
  const { data: teams = [], error, isLoading, isValidating } = useSWR(TEAMS_KEY, fetchTeams);

  const createTeam = useCallback(async (name: string, description?: string): Promise<Team | null> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('createTeam: No user found');
      return null;
    }

    console.log('createTeam: Creating team with', { name, description, created_by: user.id });

    const { data, error } = await supabase
      .from('teams' as any)
      .insert({ name, description, created_by: user.id } as any)
      .select()
      .single();

    if (error) {
      console.error('createTeam error:', error);
      throw error;
    }

    console.log('createTeam: Success', data);
    mutate(TEAMS_KEY);
    return data as Team;
  }, []);

  return {
    teams,
    isLoading,
    isValidating,
    error,
    createTeam,
  };
}

export function useTeam(teamId: string | null) {
  const { data: team, error, isLoading, isValidating } = useSWR(
    teamId ? TEAM_KEY(teamId) : null,
    () => teamId ? fetchTeam(teamId) : null
  );

  const updateTeam = useCallback(async (updates: Partial<Pick<Team, 'name' | 'description'>>) => {
    if (!teamId) return;
    const supabase = createClient() as any;

    const { error } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', teamId);

    if (error) throw error;
    mutate(TEAM_KEY(teamId));
  }, [teamId]);

  const deleteTeam = useCallback(async () => {
    if (!teamId) return;
    const supabase = createClient();

    const { error } = await supabase
      .from('teams' as any)
      .delete()
      .eq('id', teamId);

    if (error) throw error;
    mutate(TEAMS_KEY);
  }, [teamId]);

  const removeMember = useCallback(async (userId: string) => {
    if (!teamId) return;
    const supabase = createClient();

    const { error } = await supabase
      .from('team_members' as any)
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) throw error;
    mutate(TEAM_KEY(teamId));
  }, [teamId]);

  const updateMemberRole = useCallback(async (userId: string, role: 'admin' | 'member') => {
    if (!teamId) return;
    const supabase = createClient() as any;

    const { error } = await supabase
      .from('team_members')
      .update({ role })
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) throw error;
    mutate(TEAM_KEY(teamId));
  }, [teamId]);

  const leaveTeam = useCallback(async () => {
    if (!teamId) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('team_members' as any)
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', user.id);

    if (error) throw error;
    mutate(TEAMS_KEY);
    mutate(TEAM_KEY(teamId));
  }, [teamId]);

  return {
    team,
    isLoading,
    isValidating,
    error,
    updateTeam,
    deleteTeam,
    removeMember,
    updateMemberRole,
    leaveTeam,
  };
}

export function useTeamJoinRequests(teamId: string | null) {
  const { data: requests = [], error, isLoading } = useSWR(
    teamId ? JOIN_REQUESTS_KEY(teamId) : null,
    () => teamId ? fetchJoinRequests(teamId) : []
  );

  const requestToJoin = useCallback(async (teamIdOrCode: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if it's an invite code (short alphanumeric) or a UUID
    let actualTeamId = teamIdOrCode;

    // If it doesn't look like a UUID, try to find by invite code
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teamIdOrCode);
    if (!isUUID) {
      // Use RPC function to bypass RLS and lookup team by invite code
      const { data: teamId, error: teamError } = await supabase
        .rpc('get_team_id_by_invite_code', { code: teamIdOrCode });

      if (teamError || !teamId) {
        throw new Error('Team not found. Please check the invite code.');
      }
      actualTeamId = teamId;
    }

    // Check if user already has a pending request
    const { data: existingRequest } = await supabase
      .from('team_join_requests' as any)
      .select('id, status')
      .eq('team_id', actualTeamId)
      .eq('user_id', user.id)
      .single();

    if (existingRequest) {
      if ((existingRequest as any).status === 'pending') {
        throw new Error('You already have a pending request to join this team');
      }
      // Delete old rejected request to allow re-requesting
      await supabase
        .from('team_join_requests' as any)
        .delete()
        .eq('id', (existingRequest as any).id);
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('team_members' as any)
      .select('id')
      .eq('team_id', actualTeamId)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      throw new Error('You are already a member of this team');
    }

    const { error } = await supabase
      .from('team_join_requests' as any)
      .insert({ team_id: actualTeamId, user_id: user.id } as any);

    if (error) throw error;
  }, []);

  const handleRequest = useCallback(async (requestId: string, accept: boolean) => {
    if (!teamId) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: request } = await supabase
      .from('team_join_requests' as any)
      .select('user_id')
      .eq('id', requestId)
      .single();

    if (!request) return;

    const { error: updateError } = await (supabase as any)
      .from('team_join_requests')
      .update({
        status: accept ? 'accepted' : 'rejected',
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateError) throw updateError;

    if (accept) {
      const { error: memberError } = await supabase
        .from('team_members' as any)
        .insert({ team_id: teamId, user_id: (request as any).user_id, role: 'member' } as any);

      if (memberError) throw memberError;
    }

    mutate(JOIN_REQUESTS_KEY(teamId));
    mutate(TEAM_KEY(teamId));
  }, [teamId]);

  return {
    requests,
    isLoading,
    error,
    requestToJoin,
    acceptRequest: (requestId: string) => handleRequest(requestId, true),
    rejectRequest: (requestId: string) => handleRequest(requestId, false),
  };
}

export function useTeamInvitations() {
  const { data: invitations = [], error, isLoading } = useSWR(INVITATIONS_KEY, fetchInvitations);

  const inviteUser = useCallback(async (teamId: string, email: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if there's an existing invitation
    const { data: existing } = await supabase
      .from('team_invitations' as any)
      .select('id, status')
      .eq('team_id', teamId)
      .eq('invited_email', email)
      .single();

    if (existing) {
      if ((existing as any).status === 'pending') {
        throw new Error('An invitation has already been sent to this email');
      }
      // If previous invitation was rejected/accepted, delete it and create new one
      await supabase
        .from('team_invitations' as any)
        .delete()
        .eq('id', (existing as any).id);
    }

    const { error } = await supabase
      .from('team_invitations' as any)
      .insert({ team_id: teamId, invited_email: email, invited_by: user.id } as any);

    if (error) throw error;
  }, []);

  const handleInvitation = useCallback(async (invitationId: string, accept: boolean) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: invitation } = await supabase
      .from('team_invitations' as any)
      .select('team_id, status')
      .eq('id', invitationId)
      .single();

    if (!invitation) return;

    const teamId = (invitation as any).team_id;

    // If accepting, insert team member BEFORE updating invitation status
    // (RLS policy checks for pending invitation)
    if (accept) {
      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('team_members' as any)
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .single();

      if (!existingMember) {
        const { error: memberError } = await supabase
          .from('team_members' as any)
          .insert({ team_id: teamId, user_id: user.id, role: 'member' } as any);

        if (memberError) throw memberError;
      }
      mutate(TEAMS_KEY);
    }

    // Now update the invitation status
    const { error: updateError } = await (supabase as any)
      .from('team_invitations')
      .update({
        status: accept ? 'accepted' : 'rejected',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', invitationId);

    if (updateError) throw updateError;

    mutate(INVITATIONS_KEY);
  }, []);

  return {
    invitations,
    isLoading,
    error,
    inviteUser,
    acceptInvitation: (invitationId: string) => handleInvitation(invitationId, true),
    rejectInvitation: (invitationId: string) => handleInvitation(invitationId, false),
  };
}
