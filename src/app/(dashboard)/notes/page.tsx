'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { Button, FadeIn, Skeleton, useToast, ConfirmModal } from '@/components/ui';
import { useNotesSWR } from '@/hooks/useNotesSWR';
import { cn } from '@/lib/utils';
import { UI_TIMING } from '@/lib/constants';

// Dynamically import the editor to avoid SSR issues
const RichTextEditor = dynamic(
  () => import('@/components/notes/RichTextEditor').then((mod) => mod.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="p-6">
        <Skeleton className="h-8 w-1/2 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    ),
  }
);

export default function NotesPage() {
  const { showToast } = useToast();
  const { notes, isLoading, createNote, updateNote, deleteNote } = useNotesSWR();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const selectedNote = notes.find((n) => n.id === selectedNoteId) || null;

  // Auto-select first note
  useEffect(() => {
    if (!selectedNoteId && notes.length > 0 && !isLoading) {
      setSelectedNoteId(notes[0].id);
    }
  }, [notes, selectedNoteId, isLoading]);

  // Load selected note into editor
  useEffect(() => {
    if (selectedNote) {
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.content);
    }
  }, [selectedNote?.id]);

  // Auto-save with debounce
  const saveNote = useCallback(async () => {
    if (!selectedNoteId) return;
    // Use "Untitled Note" if title is empty
    const titleToSave = editTitle.trim() || 'Untitled Note';
    setIsSaving(true);
    try {
      await updateNote(selectedNoteId, { title: titleToSave, content: editContent });
    } catch (error) {
      // Silently handle save errors during auto-save
      console.error('Auto-save error:', error);
    }
    setIsSaving(false);
  }, [selectedNoteId, editTitle, editContent, updateNote]);

  useEffect(() => {
    if (!selectedNote) return;
    if (editTitle === selectedNote.title && editContent === selectedNote.content) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveNote();
    }, UI_TIMING.AUTO_SAVE_DEBOUNCE);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [editTitle, editContent, selectedNote, saveNote]);

  const handleCreateNote = async () => {
    const note = await createNote('Untitled Note', '<p></p>');
    if (note) {
      setSelectedNoteId(note.id);
      setSidebarOpen(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!selectedNoteId) return;
    const noteIdToDelete = selectedNoteId;
    setShowDeleteConfirm(false);
    await deleteNote(noteIdToDelete);
    setSelectedNoteId(notes.find((n) => n.id !== noteIdToDelete)?.id || null);
  };

  const handleExportPdf = async () => {
    if (!selectedNote || !editorContainerRef.current) return;

    setIsExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      // Create a temporary container with inline styles
      const tempContainer = document.createElement('div');
      tempContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 800px;
        padding: 40px;
        background: #ffffff;
        color: #1f2937;
        font-family: system-ui, -apple-system, sans-serif;
        line-height: 1.6;
      `;

      // Get the editor content HTML
      const editorContent = editorContainerRef.current.querySelector('.ProseMirror');
      const contentHtml = editorContent?.innerHTML || '';

      tempContainer.innerHTML = `
        <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 24px; color: #111827;">
          ${editTitle || 'Untitled'}
        </h1>
        <div style="font-size: 16px; color: #374151;">
          ${contentHtml}
        </div>
      `;

      // Apply inline styles to elements
      const applyStyles = (element: HTMLElement, parentTagName?: string) => {
        const tagName = element.tagName.toLowerCase();
        switch (tagName) {
          case 'h1':
            element.style.cssText = 'font-size: 24px; font-weight: bold; margin: 24px 0 12px; color: #111827;';
            break;
          case 'h2':
            element.style.cssText = 'font-size: 20px; font-weight: 600; margin: 20px 0 10px; color: #111827;';
            break;
          case 'h3':
            element.style.cssText = 'font-size: 18px; font-weight: 600; margin: 16px 0 8px; color: #111827;';
            break;
          case 'p':
            element.style.cssText = 'margin: 12px 0; color: #374151;';
            break;
          case 'ul':
          case 'ol':
            element.style.cssText = 'margin: 12px 0; padding-left: 24px;';
            break;
          case 'li':
            element.style.cssText = 'margin: 4px 0; color: #374151;';
            break;
          case 'code':
            // Check if code is inside a pre block
            if (parentTagName === 'pre') {
              element.style.cssText = 'background: transparent; color: #f3f4f6; padding: 0; font-family: monospace; font-size: 14px; white-space: pre-wrap;';
            } else {
              element.style.cssText = 'background: #f3f4f6; color: #ef4444; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 14px;';
            }
            break;
          case 'pre':
            element.style.cssText = 'background: #1f2937; color: #f3f4f6; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 14px; overflow-x: auto; margin: 12px 0; white-space: pre-wrap; word-wrap: break-word;';
            break;
          case 'blockquote':
            element.style.cssText = 'border-left: 4px solid #d1d5db; padding-left: 16px; margin: 12px 0; color: #6b7280; font-style: italic;';
            break;
          case 'a':
            element.style.cssText = 'color: #3b82f6; text-decoration: underline;';
            break;
          case 'strong':
            element.style.cssText = 'font-weight: 600;';
            break;
          case 'em':
            element.style.cssText = 'font-style: italic;';
            break;
          case 'mark':
            element.style.cssText = 'background: #fef08a; padding: 2px 4px;';
            break;
          case 'table':
            element.style.cssText = 'border-collapse: collapse; width: 100%; margin: 12px 0;';
            break;
          case 'th':
            element.style.cssText = 'border: 1px solid #d1d5db; padding: 8px 12px; background: #f3f4f6; font-weight: 600; text-align: left;';
            break;
          case 'td':
            element.style.cssText = 'border: 1px solid #d1d5db; padding: 8px 12px;';
            break;
        }
        Array.from(element.children).forEach((child) => applyStyles(child as HTMLElement, tagName));
      };

      applyStyles(tempContainer);
      document.body.appendChild(tempContainer);

      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      document.body.removeChild(tempContainer);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${selectedNote.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      showToast('Failed to export PDF. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get word count from HTML content
  const getWordCount = (html: string) => {
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text ? text.split(' ').length : 0;
  };

  return (
    <div className="flex h-[calc(100vh-120px)] md:h-[calc(100vh-100px)] -mx-4 sm:-mx-6 lg:-mx-8 -my-6 sm:-my-8">
      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out',
          'md:transform-none md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'pt-16 md:pt-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Notes</h2>
          </div>

          {/* Notes list */}
          <div className="flex-1 overflow-auto p-2">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-3 rounded-lg">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : notes.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                No notes yet
              </p>
            ) : (
              <div className="space-y-1">
                {notes.map((note, index) => (
                  <motion.button
                    key={note.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      setSelectedNoteId(note.id);
                      setSidebarOpen(false);
                    }}
                    className={cn(
                      'w-full text-left p-3 rounded-lg transition-colors',
                      selectedNoteId === note.id
                        ? 'bg-gray-100 dark:bg-gray-700'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    )}
                  >
                    <div className="font-medium truncate text-sm text-gray-900 dark:text-white">{note.title || 'Untitled'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatDate(note.updated_at)}
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Add note button */}
          <div className="p-2 pb-20 md:pb-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleCreateNote}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <span className="w-5 h-5 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </span>
              <span className="text-sm">New Note</span>
            </button>
          </div>
        </div>
      </aside>


      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
            {/* Title skeleton */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <Skeleton className="h-9 w-1/3" />
            </div>
            {/* Content skeleton */}
            <div className="flex-1 p-6 space-y-4">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="pt-4">
                <Skeleton className="h-6 w-1/5" />
                <div className="mt-2 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </div>
          </div>
        ) : selectedNote ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-800">
            {/* Note header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {getWordCount(editContent)} words
                  {isSaving && <span className="ml-2">Saving...</span>}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExportPdf}
                  disabled={isExporting}
                >
                  {isExporting ? 'Exporting...' : 'Export PDF'}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete
                </Button>
              </div>
            </div>

            {/* Title input */}
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Note title..."
              className="px-6 py-4 text-3xl font-bold bg-transparent text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 focus:outline-none"
            />

            {/* Rich Text Editor */}
            <div ref={editorContainerRef} className="flex-1 overflow-auto">
              <RichTextEditor
                content={editContent}
                onChange={setEditContent}
                placeholder="Start writing... Use the toolbar or type / for commands"
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Mobile hamburger for empty state */}
            <div className="md:hidden px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            <FadeIn direction="up" className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {notes.length === 0 ? 'Create your first note' : 'Select a note'}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                  {notes.length === 0
                    ? 'Write rich notes with formatting, code blocks, tables, and more'
                    : 'Choose a note from the sidebar to view or edit'}
                </p>
              </div>
            </FadeIn>
          </div>
        )}
      </main>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteNote}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
