'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button, Card, Input, Modal, FadeIn, useToast } from '@/components/ui';
import { useTeams, useTeamJoinRequests, useTeamInvitations } from '@/hooks/useTeamsSWR';
import { useTeamStore } from '@/stores/teamStore';
import type { Team, TeamInvitation } from '@/types';

export default function TeamsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { teams, isLoading, createTeam } = useTeams();
  const { invitations, acceptInvitation, rejectInvitation } = useTeamInvitations();
  const { requestToJoin } = useTeamJoinRequests(null);
  const { switchToTeam } = useTeamStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [joinTeamId, setJoinTeamId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setIsCreating(true);
    try {
      const team = await createTeam(newTeamName.trim(), newTeamDescription.trim() || undefined);
      if (team) {
        showToast('Team created', 'success');
        setShowCreateModal(false);
        setNewTeamName('');
        setNewTeamDescription('');
        router.push(`/teams/${team.id}`);
      }
    } catch (error) {
      showToast('Failed to create team', 'error');
    }
    setIsCreating(false);
  };

  const handleJoinTeam = async () => {
    if (!joinTeamId.trim()) return;
    setIsJoining(true);
    try {
      await requestToJoin(joinTeamId.trim());
      showToast('Join request sent', 'success');
      setShowJoinModal(false);
      setJoinTeamId('');
    } catch (error: any) {
      showToast(error.message || 'Failed to send join request', 'error');
    }
    setIsJoining(false);
  };

  const handleAcceptInvitation = async (invitation: TeamInvitation) => {
    try {
      await acceptInvitation(invitation.id);
      showToast(`Joined ${invitation.team?.name}`, 'success');
    } catch (error) {
      showToast('Failed to accept invitation', 'error');
    }
  };

  const handleRejectInvitation = async (invitation: TeamInvitation) => {
    try {
      await rejectInvitation(invitation.id);
      showToast('Invitation declined', 'info');
    } catch (error) {
      showToast('Failed to decline invitation', 'error');
    }
  };

  const handleSelectTeam = (team: Team) => {
    switchToTeam(team.id, team.name);
    router.push(`/teams/${team.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <FadeIn className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Teams</h1>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowJoinModal(true)}>
            Join Team
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            Create Team
          </Button>
        </div>
      </div>

      {invitations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Pending Invitations
          </h2>
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <Card key={invitation.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {invitation.team?.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Invited {new Date(invitation.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleRejectInvitation(invitation)}
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAcceptInvitation(invitation)}
                    >
                      Accept
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {teams.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No teams yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Create a team or join an existing one to collaborate
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => setShowJoinModal(true)}>
              Join Team
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              Create Team
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {teams.map((team, index) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleSelectTeam(team)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                    {team.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {team.name}
                    </h3>
                    {team.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                        {team.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      ID: {team.invite_code}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Team"
      >
        <div className="space-y-4">
          <Input
            label="Team Name"
            placeholder="My Team"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            autoFocus
          />
          <Input
            label="Description (optional)"
            placeholder="What's this team about?"
            value={newTeamDescription}
            onChange={(e) => setNewTeamDescription(e.target.value)}
          />
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTeam}
              disabled={!newTeamName.trim() || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        title="Join Team"
      >
        <div className="space-y-4">
          <Input
            label="Invite Code"
            placeholder="Enter the invite code (e.g. abc12def)"
            value={joinTeamId}
            onChange={(e) => setJoinTeamId(e.target.value)}
            autoFocus
          />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ask the team admin for the invite code. Your request will need to be approved.
          </p>
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="secondary" onClick={() => setShowJoinModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleJoinTeam}
              disabled={!joinTeamId.trim() || isJoining}
            >
              {isJoining ? 'Sending...' : 'Request to Join'}
            </Button>
          </div>
        </div>
      </Modal>
    </FadeIn>
  );
}
