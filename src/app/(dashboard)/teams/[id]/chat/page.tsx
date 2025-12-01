'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button, Card, Input, Modal, FadeIn, useToast } from '@/components/ui';
import { useTeam } from '@/hooks/useTeamsSWR';
import { useTeamMessages } from '@/hooks/useTeamMessagesSWR';
import type { TeamMessage } from '@/types';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  message: TeamMessage | null;
}

function MessageBubble({
  message,
  isOwn,
  onContextMenu,
}: {
  message: TeamMessage;
  isOwn: boolean;
  onContextMenu: (e: React.MouseEvent, message: TeamMessage) => void;
}) {
  const displayName = message.profile?.display_name || 'User';
  const avatarUrl = message.profile?.avatar_url;
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}
    >
      {/* Avatar for other users */}
      {!isOwn && (
        <div className="flex-shrink-0 mr-2 mt-5">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-medium">
              {initials}
            </div>
          )}
        </div>
      )}
      <div
        className={`max-w-[70%]`}
        onContextMenu={(e) => isOwn ? onContextMenu(e, message) : undefined}
      >
        {!isOwn && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">
            {displayName}
          </p>
        )}
        <div
          className={`rounded-2xl px-4 py-2 ${
            message.type === 'meet'
              ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
              : message.type === 'link'
              ? 'bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800'
              : isOwn
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
          }`}
        >
          {message.type === 'meet' ? (
            <div>
              <p className="text-sm text-gray-900 dark:text-white mb-2">{message.content}</p>
              <a
                href={message.metadata?.meet_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                </svg>
                Join Meet
              </a>
            </div>
          ) : message.type === 'link' ? (
            <div>
              <p className="text-sm text-gray-900 dark:text-white mb-2">{message.metadata?.link_title || message.content}</p>
              <a
                href={message.metadata?.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-orange-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open Link
              </a>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          )}
        </div>
        <div className={`flex items-center gap-2 mt-1 px-1 ${isOwn ? 'justify-end' : ''}`}>
          <span className="text-xs text-gray-400">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {message.edited_at && (
            <span className="text-xs text-gray-400">(edited)</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Play a pop sound using Web Audio API
const playPopSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    // Silently fail if audio is not supported
  }
};

export default function TeamChatPage() {
  const params = useParams();
  const teamId = params.id as string;
  const { showToast } = useToast();

  const { team, isLoading: teamLoading } = useTeam(teamId);
  const { messages, isLoading: messagesLoading, isLoadingMore, hasMore, loadMore, sendMessage, editMessage, deleteMessage } = useTeamMessages(teamId);

  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    message: null,
  });

  // Edit modal state
  const [editModal, setEditModal] = useState<{ open: boolean; message: TeamMessage | null }>({
    open: false,
    message: null,
  });
  const [editContent, setEditContent] = useState('');

  // Attachment modal state
  const [attachModal, setAttachModal] = useState(false);

  // Meet link modal state
  const [meetModal, setMeetModal] = useState(false);
  const [meetLink, setMeetLink] = useState('');

  // Link modal state
  const [linkModal, setLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  useEffect(() => {
    const getUser = async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!messagesLoading && messages.length > 0 && !initialScrollDone) {
      // Use instant scroll for initial load
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
      setInitialScrollDone(true);
    }
  }, [messages, messagesLoading, initialScrollDone]);

  // Auto-scroll when new messages arrive (if user is near bottom)
  const prevMessageCountRef = useRef(messages.length);
  useEffect(() => {
    if (initialScrollDone && messages.length > prevMessageCountRef.current) {
      const container = messagesContainerRef.current;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        if (isNearBottom) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length, initialScrollDone]);

  // Scroll to bottom when sending a new message
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Handle scroll for loading more messages (when scrolling to top) and show/hide scroll button
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Check if user has scrolled up (more than 100px from bottom)
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShowScrollButton(!isNearBottom);

    // Load more when scrolled near the top (within 100px)
    if (container.scrollTop < 100 && hasMore && !isLoadingMore) {
      // Remember scroll position to maintain it after loading
      const previousScrollHeight = container.scrollHeight;

      loadMore();

      // After loading, adjust scroll to maintain position
      requestAnimationFrame(() => {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop = newScrollHeight - previousScrollHeight;
      });
    }
  }, [hasMore, isLoadingMore, loadMore]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(prev => ({ ...prev, visible: false }));
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, message: TeamMessage) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      message,
    });
  };

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;
    setIsSending(true);
    try {
      await sendMessage(newMessage.trim());
      setNewMessage('');
      playPopSound();
      // Scroll to bottom after sending
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      showToast('Failed to send message', 'error');
    }
    setIsSending(false);
  };

  const handleOpenMeetModal = () => {
    setMeetLink('');
    setMeetModal(true);
  };

  const handleSendMeet = async () => {
    if (!meetLink.trim()) return;

    // Validate it looks like a meet link
    if (!meetLink.includes('meet.google.com')) {
      showToast('Please enter a valid Google Meet link', 'error');
      return;
    }

    setIsSending(true);
    try {
      await sendMessage('Join my Google Meet call', 'meet', { meet_link: meetLink.trim() });
      setMeetModal(false);
      setMeetLink('');
    } catch (error) {
      showToast('Failed to send Meet invite', 'error');
    }
    setIsSending(false);
  };

  const handleSendLink = async () => {
    if (!linkUrl.trim()) return;

    // Basic URL validation
    try {
      new URL(linkUrl.trim());
    } catch {
      showToast('Please enter a valid URL', 'error');
      return;
    }

    setIsSending(true);
    try {
      await sendMessage(linkTitle.trim() || 'Shared a link', 'link', { link_url: linkUrl.trim(), link_title: linkTitle.trim() });
      setLinkModal(false);
      setLinkUrl('');
      setLinkTitle('');
    } catch (error) {
      showToast('Failed to send link', 'error');
    }
    setIsSending(false);
  };

  const handleOpenEdit = () => {
    if (contextMenu.message) {
      setEditContent(contextMenu.message.content);
      setEditModal({ open: true, message: contextMenu.message });
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleSaveEdit = async () => {
    if (!editModal.message || !editContent.trim()) return;
    try {
      await editMessage(editModal.message.id, editContent.trim());
      setEditModal({ open: false, message: null });
    } catch (error) {
      showToast('Failed to edit message', 'error');
    }
  };

  const handleDelete = async () => {
    if (!contextMenu.message) return;
    try {
      await deleteMessage(contextMenu.message.id);
    } catch (error) {
      showToast('Failed to delete message', 'error');
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  if (teamLoading || messagesLoading) {
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
        <Button onClick={() => window.history.back()}>Go Back</Button>
      </FadeIn>
    );
  }

  return (
    <div className="fixed inset-0 top-14 sm:top-16 bottom-[4.5rem] sm:bottom-0 flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Compact header - full width */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 px-4 py-2 max-w-3xl mx-auto">
          <Link
            href={`/teams/${teamId}`}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate">{team.name}</h1>
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto overflow-hidden">
        {/* Messages area */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4"
        >
          {/* Loading indicator for older messages */}
          {isLoadingMore && (
            <div className="flex justify-center py-2 mb-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
            </div>
          )}

          {/* Load more button (alternative to infinite scroll) */}
          {hasMore && !isLoadingMore && (
            <div className="flex justify-center py-2 mb-2">
              <button
                onClick={loadMore}
                className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Load older messages
              </button>
            </div>
          )}

          {messages.length === 0 && !messagesLoading ? (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.user_id === currentUserId}
                  onContextMenu={handleContextMenu}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <div className="flex justify-center pb-2">
            <button
              onClick={scrollToBottom}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-800 dark:bg-gray-700 text-white text-sm shadow-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              New messages
            </button>
          </div>
        )}

        {/* Input area with + button */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAttachModal(true)}
              className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Add attachment"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              className="flex-1"
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || isSending}
              className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.message?.type !== 'meet' && (
            <button
              onClick={handleOpenEdit}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Edit
            </button>
          )}
          <button
            onClick={handleDelete}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Delete
          </button>
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, message: null })}
        title="Edit Message"
      >
        <div className="space-y-4">
          <Input
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Message content"
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setEditModal({ open: false, message: null })}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editContent.trim()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Attachment Selection Modal */}
      <Modal
        isOpen={attachModal}
        onClose={() => setAttachModal(false)}
        title="Add Attachment"
      >
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              setAttachModal(false);
              // TODO: Implement image upload
              showToast('Image upload coming soon', 'info');
            }}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Image</span>
          </button>

          <button
            onClick={() => {
              setAttachModal(false);
              // TODO: Implement file upload
              showToast('File upload coming soon', 'info');
            }}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">File</span>
          </button>

          <button
            onClick={() => {
              setAttachModal(false);
              setMeetModal(true);
            }}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Google Meet</span>
          </button>

          <button
            onClick={() => {
              setAttachModal(false);
              setLinkModal(true);
            }}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Link</span>
          </button>
        </div>
      </Modal>

      {/* Meet Link Modal */}
      <Modal
        isOpen={meetModal}
        onClose={() => setMeetModal(false)}
        title="Share Google Meet"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Paste your Google Meet link to share with the team.
          </p>
          <Input
            value={meetLink}
            onChange={(e) => setMeetLink(e.target.value)}
            placeholder="https://meet.google.com/xxx-xxxx-xxx"
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setMeetModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendMeet} disabled={!meetLink.trim() || isSending}>
              Share
            </Button>
          </div>
        </div>
      </Modal>

      {/* Link Modal */}
      <Modal
        isOpen={linkModal}
        onClose={() => setLinkModal(false)}
        title="Share Link"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Share a link with the team.
          </p>
          <Input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            label="URL"
            autoFocus
          />
          <Input
            value={linkTitle}
            onChange={(e) => setLinkTitle(e.target.value)}
            placeholder="Link title (optional)"
            label="Title"
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setLinkModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendLink} disabled={!linkUrl.trim() || isSending}>
              Share
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
