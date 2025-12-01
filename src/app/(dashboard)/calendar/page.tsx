'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  getHours,
  getMinutes,
  differenceInMinutes,
} from 'date-fns';
import { Button, Card, Modal, Input, FadeIn, StaggerContainer, StaggerItem, Skeleton, useToast, ConfirmModal } from '@/components/ui';
import { useGoogleCalendarSWR } from '@/hooks/useGoogleCalendarSWR';
import { useTeamCalendarSWR } from '@/hooks/useTeamCalendarSWR';
import { useTeamStore } from '@/stores/teamStore';
import type { GoogleCalendarEvent } from '@/lib/google-calendar';
import type { TeamEvent } from '@/types';
import { CALENDAR_COLORS, TIME_UNITS, TIMELINE_CONFIG } from '@/lib/constants';

interface LocalEvent {
  id: string;
  title: string;
  description?: string;
  date: Date;
  endDate?: Date;
  isAllDay: boolean;
  isGoogleEvent: boolean;
  isTeamEvent: boolean;
  color: string;
  creatorName?: string;
}

const HOURS = Array.from({ length: TIME_UNITS.HOURS_PER_DAY }, (_, i) => i);

interface TimelineProps {
  events: LocalEvent[];
  selectedDate: Date;
  onEventClick: (event: LocalEvent) => void;
}

function Timeline({ events, selectedDate, onEventClick }: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const currentHour = new Date().getHours();

  // Scroll to current hour or 8am on mount
  useEffect(() => {
    if (timelineRef.current) {
      const scrollToHour = isToday(selectedDate) ? Math.max(0, currentHour - 1) : 8;
      const scrollPosition = scrollToHour * 60; // 60px per hour
      timelineRef.current.scrollTop = scrollPosition;
    }
  }, [selectedDate, currentHour]);

  // Filter timed events (not all-day)
  const timedEvents = events.filter((e) => !e.isAllDay);
  const allDayEvents = events.filter((e) => e.isAllDay);

  const getEventPosition = (event: LocalEvent) => {
    const startHour = getHours(event.date);
    const startMinute = getMinutes(event.date);
    const top = startHour * 60 + startMinute; // 60px per hour

    let height = 60; // default 1 hour
    if (event.endDate) {
      const duration = differenceInMinutes(event.endDate, event.date);
      height = Math.max(20, duration); // minimum 20px height
    }

    return { top, height };
  };

  return (
    <div className="flex flex-col h-full">
      {/* All day events section */}
      {allDayEvents.length > 0 && (
        <div className="border-b border-gray-200 dark:border-gray-700 p-2 flex-shrink-0">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">All Day</div>
          <div className="space-y-1">
            {allDayEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => onEventClick(event)}
                className={`text-xs text-white px-2 py-1 rounded cursor-pointer hover:opacity-80 ${event.color}`}
              >
                {event.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline scroll area */}
      <div ref={timelineRef} className="flex-1 overflow-auto">
        <div className="relative" style={{ height: `${24 * 60}px` }}>
          {/* Hour lines */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute w-full border-t border-gray-100 dark:border-gray-700/50 flex"
              style={{ top: `${hour * 60}px`, height: '60px' }}
            >
              <div className="w-12 flex-shrink-0 text-xs text-gray-400 dark:text-gray-500 pr-2 text-right -mt-2">
                {format(new Date().setHours(hour, 0), 'h a')}
              </div>
              <div className="flex-1 relative" />
            </div>
          ))}

          {/* Current time indicator */}
          {isToday(selectedDate) && (
            <div
              className="absolute left-12 right-0 flex items-center z-20 pointer-events-none"
              style={{ top: `${currentHour * 60 + new Date().getMinutes()}px` }}
            >
              <div className="w-2 h-2 bg-red-500 rounded-full -ml-1" />
              <div className="flex-1 h-0.5 bg-red-500" />
            </div>
          )}

          {/* Events */}
          {timedEvents.map((event) => {
            const { top, height } = getEventPosition(event);
            return (
              <div
                key={event.id}
                onClick={() => onEventClick(event)}
                className={`absolute left-14 right-2 ${event.color} text-white text-xs rounded px-2 py-1 cursor-pointer hover:opacity-80 overflow-hidden z-10`}
                style={{ top: `${top}px`, height: `${height}px` }}
              >
                <div className="font-medium truncate">{event.title}</div>
                {height > 30 && (
                  <div className="text-white/80 truncate">
                    {format(event.date, 'h:mm a')}
                    {event.endDate && ` - ${format(event.endDate, 'h:mm a')}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function parseGoogleEvent(event: GoogleCalendarEvent): LocalEvent {
  const startStr = event.start.dateTime || event.start.date;
  const endStr = event.end.dateTime || event.end.date;
  const isAllDay = !event.start.dateTime;

  return {
    id: event.id,
    title: event.summary || '(No title)',
    description: event.description,
    date: startStr ? parseISO(startStr) : new Date(),
    endDate: endStr ? parseISO(endStr) : undefined,
    isAllDay,
    isGoogleEvent: true,
    isTeamEvent: false,
    color: 'bg-blue-500',
  };
}

function parseTeamEvent(event: TeamEvent): LocalEvent {
  return {
    id: event.id,
    title: event.title,
    description: event.description || undefined,
    date: parseISO(event.start_time),
    endDate: parseISO(event.end_time),
    isAllDay: event.is_all_day,
    isGoogleEvent: false,
    isTeamEvent: true,
    color: event.color,
    creatorName: event.profile?.display_name || undefined,
  };
}

export default function CalendarPage() {
  const { showToast } = useToast();
  const { mode, activeTeamId } = useTeamStore();
  const isTeamMode = mode === 'team' && activeTeamId;
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Form state
  const [editingEvent, setEditingEvent] = useState<LocalEvent | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('bg-blue-500');
  const [isAllDay, setIsAllDay] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [eventDate, setEventDate] = useState('');
  const [modalTab, setModalTab] = useState<'timeline' | 'events'>('timeline');
  const [eventToDelete, setEventToDelete] = useState<LocalEvent | null>(null);

  // Use SWR-based hook for Google Calendar (personal mode only)
  const {
    events: googleEvents,
    isConnected,
    isLoading: googleLoading,
    isValidating: googleValidating,
    error: googleError,
    addEvent: addGoogleEvent,
    editEvent: editGoogleEvent,
    removeEvent: removeGoogleEvent,
    prefetchMonth,
  } = useGoogleCalendarSWR(currentMonth, !isTeamMode);

  // Use team calendar hook (team mode)
  const {
    events: teamEvents,
    isLoading: teamLoading,
    isValidating: teamValidating,
    error: teamError,
    addEvent: addTeamEvent,
    editEvent: editTeamEvent,
    removeEvent: removeTeamEvent,
  } = useTeamCalendarSWR(isTeamMode ? activeTeamId : null, currentMonth);

  // Convert events to local format based on mode
  const events = useMemo(() => {
    if (isTeamMode) {
      return teamEvents.map(parseTeamEvent);
    }
    return googleEvents.map(parseGoogleEvent);
  }, [isTeamMode, googleEvents, teamEvents]);

  const isLoading = isTeamMode ? teamLoading : googleLoading;
  const isValidating = isTeamMode ? teamValidating : googleValidating;
  const error = isTeamMode ? teamError : googleError;

  // Prefetch adjacent months when current month changes
  useEffect(() => {
    if (isConnected) {
      prefetchMonth(addMonths(currentMonth, 1));
      prefetchMonth(subMonths(currentMonth, 1));
    }
  }, [currentMonth, isConnected, prefetchMonth]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const generateCalendarDays = () => {
    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => isSameDay(event.date, date));
  };

  const resetForm = () => {
    setEditingEvent(null);
    setEventTitle('');
    setEventDescription('');
    setSelectedColor('bg-blue-500');
    setIsAllDay(true);
    setStartTime('09:00');
    setEndTime('10:00');
    setEventDate('');
  };

  const handleDateClick = (date: Date) => {
    resetForm();
    setSelectedDate(date);
    setEventDate(format(date, 'yyyy-MM-dd'));
    setModalTab('timeline');
    setShowModal(true);
  };

  const handleEditEvent = (event: LocalEvent) => {
    setEditingEvent(event);
    setEventTitle(event.title);
    setEventDescription(event.description || '');
    setIsAllDay(event.isAllDay);
    setEventDate(format(event.date, 'yyyy-MM-dd'));

    if (!event.isAllDay) {
      setStartTime(format(event.date, 'HH:mm'));
      if (event.endDate) {
        setEndTime(format(event.endDate, 'HH:mm'));
      }
    }
  };

  const handleSubmitEvent = async () => {
    if (!eventTitle.trim() || !eventDate) return;

    // Check permissions based on mode
    if (!isTeamMode && !isConnected) {
      showToast('Please connect Google Calendar to add events.', 'error');
      return;
    }

    try {
      setIsSyncing(true);

      // Get user's timezone
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Calculate start and end times
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      const startDateObj = new Date(eventDate);
      startDateObj.setHours(isAllDay ? 0 : startHour, isAllDay ? 0 : startMin, 0, 0);

      const endDateObj = new Date(eventDate);
      endDateObj.setHours(isAllDay ? 23 : endHour, isAllDay ? 59 : endMin, isAllDay ? 59 : 0, 0);

      if (isTeamMode) {
        // Team calendar events
        if (editingEvent) {
          await editTeamEvent(editingEvent.id, {
            title: eventTitle,
            description: eventDescription || undefined,
            start_time: startDateObj.toISOString(),
            end_time: endDateObj.toISOString(),
            is_all_day: isAllDay,
            color: selectedColor,
          });
        } else {
          await addTeamEvent({
            title: eventTitle,
            description: eventDescription || undefined,
            start_time: startDateObj.toISOString(),
            end_time: endDateObj.toISOString(),
            is_all_day: isAllDay,
            color: selectedColor,
          });
        }
      } else {
        // Google Calendar events
        let start: { dateTime: string; timeZone: string } | { date: string };
        let end: { dateTime: string; timeZone: string } | { date: string };

        if (isAllDay) {
          start = { date: eventDate };
          end = { date: eventDate };
        } else {
          start = { dateTime: startDateObj.toISOString(), timeZone };
          end = { dateTime: endDateObj.toISOString(), timeZone };
        }

        if (editingEvent) {
          await editGoogleEvent(editingEvent.id, {
            summary: eventTitle,
            description: eventDescription || undefined,
            start,
            end,
          });
        } else {
          await addGoogleEvent({
            summary: eventTitle,
            description: eventDescription || undefined,
            start,
            end,
          });
        }
      }

      resetForm();
      setShowModal(false);
    } catch (err) {
      console.error('Failed to save event:', err);
      showToast('Failed to save event. Please try again.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteEvent = async (event: LocalEvent) => {
    if (!isTeamMode && !isConnected) return;

    try {
      setIsSyncing(true);

      if (event.isTeamEvent) {
        await removeTeamEvent(event.id);
      } else {
        await removeGoogleEvent(event.id);
      }

      if (editingEvent?.id === event.id) {
        resetForm();
      }
    } catch (err) {
      console.error('Failed to delete event:', err);
      showToast('Failed to delete event. Please try again.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    const event = eventToDelete;
    setEventToDelete(null);
    await handleDeleteEvent(event);
  };

  const days = generateCalendarDays();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mobile header */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isTeamMode ? 'Team Calendar' : 'Calendar'}
          </h1>
          <Button variant="secondary" size="sm" onClick={() => setCurrentMonth(new Date())}>
            Today
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 text-gray-600 dark:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 text-gray-600 dark:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        {isTeamMode ? (
          <p className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1 mt-1">
            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
            Team shared calendar
            {(isSyncing || isValidating) && <span className="ml-1 text-gray-500">(syncing...)</span>}
          </p>
        ) : isConnected ? (
          <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            Google Calendar synced
            {(isSyncing || isValidating) && <span className="ml-1 text-gray-500">(syncing...)</span>}
          </p>
        ) : null}
        {error && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            {error}
          </p>
        )}
      </div>

      {/* Desktop header */}
      <div className="hidden sm:flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isTeamMode ? 'Team Calendar' : 'Calendar'}
          </h1>
          {isTeamMode ? (
            <p className="text-sm text-purple-600 dark:text-purple-400 flex items-center gap-1 mt-1">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Team shared calendar
              {(isSyncing || isValidating) && <span className="ml-2 text-gray-500">(syncing...)</span>}
            </p>
          ) : isConnected ? (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Synced with Google Calendar
              {(isSyncing || isValidating) && <span className="ml-2 text-gray-500">(syncing...)</span>}
            </p>
          ) : null}
          {error && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              {error}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white min-w-[180px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button variant="ghost" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
          <Button variant="secondary" onClick={() => setCurrentMonth(new Date())}>
            Today
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card className="overflow-hidden">
          {/* Week day headers skeleton */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
            {weekDays.map((day) => (
              <div
                key={day}
                className="py-2 sm:py-3 text-center text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400"
              >
                <span className="sm:hidden">{day.charAt(0)}</span>
                <span className="hidden sm:inline">{day}</span>
              </div>
            ))}
          </div>
          {/* Calendar grid skeleton */}
          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }).map((_, idx) => (
              <div
                key={idx}
                className="min-h-[60px] sm:min-h-[100px] p-1 sm:p-2 border-b border-r border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-center sm:justify-start mb-0.5 sm:mb-1">
                  <Skeleton className="w-6 h-6 sm:w-7 sm:h-7 rounded-full" />
                </div>
                {idx % 3 === 0 && (
                  <div className="space-y-0.5 sm:space-y-1 mt-1">
                    <Skeleton className="h-4 w-full rounded" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <FadeIn direction="up">
          <Card className="overflow-hidden">
            {/* Week day headers */}
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="py-2 sm:py-3 text-center text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400"
                >
                  <span className="sm:hidden">{day.charAt(0)}</span>
                  <span className="hidden sm:inline">{day}</span>
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {days.map((day, idx) => {
                const dayEvents = getEventsForDate(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isCurrentDay = isToday(day);

                return (
                  <div
                    key={idx}
                    onClick={() => handleDateClick(day)}
                    className={`
                      min-h-[60px] sm:min-h-[100px] p-1 sm:p-2 border-b border-r border-gray-200 dark:border-gray-700 cursor-pointer
                      hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                      ${!isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800/50' : ''}
                    `}
                  >
                    <div className="flex items-center justify-center sm:justify-start mb-0.5 sm:mb-1">
                      <span
                        className={`
                          text-xs sm:text-sm font-medium w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full
                          ${isCurrentDay ? 'bg-blue-500 text-white' : ''}
                          ${!isCurrentMonth ? 'text-gray-400 dark:text-gray-600' : 'text-gray-900 dark:text-white'}
                        `}
                      >
                        {format(day, 'd')}
                      </span>
                    </div>
                    <div className="space-y-0.5 sm:space-y-1">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className={`text-[10px] sm:text-xs text-white px-1 sm:px-2 py-0.5 rounded truncate ${event.color}`}
                          title={event.title}
                        >
                          <span className="hidden sm:inline">{event.title}</span>
                          <span className="sm:hidden">•</span>
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 px-1 sm:px-2">
                          +{dayEvents.length - 2}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </FadeIn>
      )}

      {/* Add/Edit Events Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingEvent ? 'Edit Event' : selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'New Event'}
        size="xl"
      >
        {selectedDate && (
          <div className="flex flex-col h-[70vh]">
            {/* Mobile tabs */}
            <div className="md:hidden flex border-b border-gray-200 dark:border-gray-700 -mx-6 px-6 mb-4">
              <button
                onClick={() => setModalTab('timeline')}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  modalTab === 'timeline'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setModalTab('events')}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  modalTab === 'events'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Events & Add
              </button>
            </div>

            {/* Desktop: side by side, Mobile: tabbed */}
            <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
              {/* Timeline - shown on desktop always, mobile when tab selected */}
              <div className={`${modalTab === 'timeline' ? 'flex' : 'hidden'} md:flex flex-col flex-1 min-w-0 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden`}>
                <div className="bg-gray-50 dark:bg-gray-700/50 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                  Day Timeline
                </div>
                <div className="flex-1 overflow-hidden">
                  <Timeline
                    events={getEventsForDate(selectedDate)}
                    selectedDate={selectedDate}
                    onEventClick={(event) => {
                      handleEditEvent(event);
                      setModalTab('events');
                    }}
                  />
                </div>
              </div>

              {/* Events list and form - shown on desktop always, mobile when tab selected */}
              <div className={`${modalTab === 'events' ? 'flex' : 'hidden'} md:flex flex-col flex-1 min-w-0 overflow-auto`}>
                <div className="space-y-4">
                  {/* Existing events for this date */}
                  {!editingEvent && getEventsForDate(selectedDate).length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Events</h3>
                      {getEventsForDate(selectedDate).map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                          <div
                            className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                            onClick={() => handleEditEvent(event)}
                          >
                            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${event.color}`} />
                            <div className="min-w-0">
                              <span className="text-sm text-gray-900 dark:text-white block truncate">
                                {event.title}
                              </span>
                              <span className="text-xs text-gray-500">
                                {!event.isAllDay && format(event.date, 'h:mm a')}
                                {!event.isAllDay && event.endDate && ` - ${format(event.endDate, 'h:mm a')}`}
                                {event.isAllDay && 'All day'}
                                {' • '}
                                {event.isTeamEvent ? (event.creatorName || 'Team') : event.isGoogleEvent ? 'Google Calendar' : 'Local'}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEventToDelete(event);
                            }}
                            className="text-red-500 hover:text-red-600 text-sm flex-shrink-0 ml-2 p-1"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Add New Event
                        </h3>
                      </div>
                    </div>
                  )}

                  {editingEvent && (
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Edit Event</h3>
                      <Button variant="ghost" size="sm" onClick={resetForm}>
                        Cancel Edit
                      </Button>
                    </div>
                  )}

                  {/* Event form */}
                  <div className="space-y-3">
                    <Input
                      label="Title"
                      placeholder="Event title"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                    />
                    <Input
                      label="Description"
                      placeholder="Description (optional)"
                      value={eventDescription}
                      onChange={(e) => setEventDescription(e.target.value)}
                    />
                    <Input
                      label="Date"
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="allDay"
                        checked={isAllDay}
                        onChange={(e) => setIsAllDay(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="allDay" className="text-sm text-gray-700 dark:text-gray-300">
                        All day
                      </label>
                    </div>
                    {!isAllDay && (
                      <div className="flex gap-3">
                        <Input
                          label="Start time"
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                        />
                        <Input
                          label="End time"
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                        />
                      </div>
                    )}
                    {(isTeamMode || (!isConnected && !editingEvent)) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Color
                        </label>
                        <div className="flex gap-2">
                          {CALENDAR_COLORS.map((color) => (
                            <button
                              key={color.id}
                              onClick={() => setSelectedColor(color.bg)}
                              className={`
                                w-8 h-8 rounded-full ${color.bg} transition-transform
                                ${selectedColor === color.bg ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''}
                              `}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 justify-between pt-2">
                    <div>
                      {editingEvent && (
                        <Button
                          variant="danger"
                          onClick={() => setEventToDelete(editingEvent)}
                          disabled={isSyncing}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowModal(false);
                          resetForm();
                        }}
                      >
                        Close
                      </Button>
                      <Button onClick={handleSubmitEvent} disabled={!eventTitle.trim() || !eventDate || isSyncing}>
                        {isSyncing ? 'Saving...' : editingEvent ? 'Update Event' : 'Add Event'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={!!eventToDelete}
        onClose={() => setEventToDelete(null)}
        onConfirm={confirmDeleteEvent}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
