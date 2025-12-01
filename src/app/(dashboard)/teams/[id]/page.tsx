'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button, Card, Input, Modal, FadeIn, useToast, ConfirmModal } from '@/components/ui';
import { useTeam, useTeamJoinRequests, useTeamInvitations } from '@/hooks/useTeamsSWR';
import { useTeamStore } from '@/stores/teamStore';
import { createClient } from '@/lib/supabase/client';
import type { TeamMember, TeamJoinRequest } from '@/types';

export default function TeamDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.id as string;
  const { showToast } = useToast();
  const { switchToPersonal } = useTeamStore();

  const { team, isLoading, updateTeam, deleteTeam, removeMember, updateMemberRole, leaveTeam } = useTeam(teamId);
  const { requests, acceptRequest, rejectRequest } = useTeamJoinRequests(teamId);
  const { inviteUser } = useTeamInvitations();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  const currentUserMember = team?.members.find((m) => m.user_id === currentUserId);
  const isLeader = currentUserMember?.role === 'leader';
  const isAdmin = isLeader || currentUserMember?.role === 'admin';

  const handleOpenSettings = () => {
    if (team) {
      setEditName(team.name);
      setEditDescription(team.description || '');
    }
    setShowSettingsModal(true);
  };

  const handleUpdateTeam = async () => {
    if (!editName.trim()) return;
    setIsUpdating(true);
    try {
      await updateTeam({ name: editName.trim(), description: editDescription.trim() || null });
      showToast('Team updated', 'success');
      setShowSettingsModal(false);
    } catch (error) {
      showToast('Failed to update team', 'error');
    }
    setIsUpdating(false);
  };

  const handleDeleteTeam = async () => {
    try {
      await deleteTeam();
      showToast('Team deleted', 'success');
      switchToPersonal();
      router.push('/teams');
    } catch (error) {
      showToast('Failed to delete team', 'error');
    }
  };

  const handleLeaveTeam = async () => {
    try {
      await leaveTeam();
      showToast('Left team', 'success');
      switchToPersonal();
      router.push('/teams');
    } catch (error) {
      showToast('Failed to leave team', 'error');
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    try {
      await inviteUser(teamId, inviteEmail.trim());
      showToast('Invitation sent', 'success');
      setShowInviteModal(false);
      setInviteEmail('');
    } catch (error) {
      showToast('Failed to send invitation', 'error');
    }
    setIsInviting(false);
  };

  const handleAcceptRequest = async (request: TeamJoinRequest) => {
    try {
      await acceptRequest(request.id);
      showToast(`${request.profile?.display_name || 'User'} joined the team`, 'success');
    } catch (error) {
      showToast('Failed to accept request', 'error');
    }
  };

  const handleRejectRequest = async (request: TeamJoinRequest) => {
    try {
      await rejectRequest(request.id);
      showToast('Request rejected', 'info');
    } catch (error) {
      showToast('Failed to reject request', 'error');
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    try {
      await removeMember(member.user_id);
      showToast(`${member.profile?.display_name || 'User'} removed`, 'success');
    } catch (error) {
      showToast('Failed to remove member', 'error');
    }
  };

  const handleToggleAdmin = async (member: TeamMember) => {
    const newRole = member.role === 'admin' ? 'member' : 'admin';
    try {
      await updateMemberRole(member.user_id, newRole);
      showToast(`Role updated to ${newRole}`, 'success');
    } catch (error) {
      showToast('Failed to update role', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!team) {
    return (
      <FadeIn className="max-w-4xl mx-auto text-center py-12">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Team not found
        </h1>
        <Button onClick={() => router.push('/teams')}>Back to Teams</Button>
      </FadeIn>
    );
  }

  return (
    <FadeIn className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/teams"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Teams
            </Link>
            <span className="text-gray-400">/</span>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{team.name}</h1>
          </div>
          {team.description && (
            <p className="text-gray-500 dark:text-gray-400">{team.description}</p>
          )}
        </div>
        <div className="flex gap-3">
          <Link href={`/teams/${teamId}/chat`}>
            <Button variant="secondary">Chat</Button>
          </Link>
          {isAdmin && (
            <Button variant="secondary" onClick={() => setShowInviteModal(true)}>
              Invite
            </Button>
          )}
          {isLeader && (
            <Button variant="secondary" onClick={handleOpenSettings}>
              Settings
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Members ({team.members.length})
              </h2>
            </div>
            <div className="space-y-3">
              {team.members.map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                      {member.profile?.avatar_url ? (
                        <img src={member.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                          {(member.profile?.display_name || 'U').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {member.profile?.display_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {member.role}
                      </p>
                    </div>
                  </div>
                  {isLeader && member.role !== 'leader' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleAdmin(member)}
                        className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        {member.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                      </button>
                      <button
                        onClick={() => handleRemoveMember(member)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </Card>

          {isAdmin && requests.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Join Requests ({requests.length})
              </h2>
              <div className="space-y-3">
                {requests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                          {(request.profile?.display_name || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {request.profile?.display_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Requested {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => handleRejectRequest(request)}>
                        Reject
                      </Button>
                      <Button size="sm" onClick={() => handleAcceptRequest(request)}>
                        Accept
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Team Info
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Team ID</p>
                <p className="font-mono text-gray-900 dark:text-white">{team.invite_code}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Created</p>
                <p className="text-gray-900 dark:text-white">
                  {new Date(team.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Actions
            </h2>
            <div className="space-y-2">
              {!isLeader && (
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => setShowLeaveConfirm(true)}
                >
                  Leave Team
                </Button>
              )}
              {isLeader && (
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete Team
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="Team Settings"
      >
        <div className="space-y-4">
          <Input
            label="Team Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <Input
            label="Description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
          />
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="secondary" onClick={() => setShowSettingsModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTeam} disabled={!editName.trim() || isUpdating}>
              {isUpdating ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite to Team"
      >
        <div className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="user@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="secondary" onClick={() => setShowInviteModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={!inviteEmail.trim() || isInviting}>
              {isInviting ? 'Sending...' : 'Send Invite'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteTeam}
        title="Delete Team"
        message="This will permanently delete the team and all its data. This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      <ConfirmModal
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={handleLeaveTeam}
        title="Leave Team"
        message="Are you sure you want to leave this team?"
        confirmText="Leave"
        variant="danger"
      />
    </FadeIn>
  );
}
