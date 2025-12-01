export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  colorId?: string;
}

export interface GoogleCalendarList {
  items: {
    id: string;
    summary: string;
    primary?: boolean;
    backgroundColor?: string;
  }[];
}

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

// Calendar ID validation regex - allows 'primary' or email-like format
const CALENDAR_ID_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$|^primary$/;

/**
 * Validates a calendar ID to prevent injection attacks
 */
function validateCalendarId(calendarId: string): void {
  if (!CALENDAR_ID_REGEX.test(calendarId)) {
    throw new Error('Invalid calendar ID format');
  }
}

/**
 * Validates an event ID (alphanumeric string)
 */
function validateEventId(eventId: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(eventId)) {
    throw new Error('Invalid event ID format');
  }
}

export async function getCalendarList(accessToken: string): Promise<GoogleCalendarList> {
  const response = await fetch(`${CALENDAR_API_BASE}/users/me/calendarList`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch calendars: ${response.statusText}`);
  }

  return response.json();
}

export async function getCalendarEvents(
  accessToken: string,
  calendarId: string = 'primary',
  timeMin?: Date,
  timeMax?: Date
): Promise<GoogleCalendarEvent[]> {
  // Validate calendar ID
  validateCalendarId(calendarId);

  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
  });

  if (timeMin) {
    params.set('timeMin', timeMin.toISOString());
  }
  if (timeMax) {
    params.set('timeMax', timeMax.toISOString());
  }

  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Google Calendar API error:', errorData);
    throw new Error(
      errorData?.error?.message ||
      `Failed to fetch events: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.items || [];
}

export async function createCalendarEvent(
  accessToken: string,
  event: {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone: string } | { date: string };
    end: { dateTime: string; timeZone: string } | { date: string };
  },
  calendarId: string = 'primary'
): Promise<GoogleCalendarEvent> {
  // Validate calendar ID
  validateCalendarId(calendarId);

  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create event: ${response.statusText}`);
  }

  return response.json();
}

export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  event: {
    summary?: string;
    description?: string;
    start?: { dateTime: string; timeZone: string } | { date: string };
    end?: { dateTime: string; timeZone: string } | { date: string };
  },
  calendarId: string = 'primary'
): Promise<GoogleCalendarEvent> {
  // Validate inputs
  validateCalendarId(calendarId);
  validateEventId(eventId);

  // First, get the existing event to merge with updates
  const getResponse = await fetch(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!getResponse.ok) {
    throw new Error('Failed to fetch existing event');
  }

  const existingEvent = await getResponse.json();

  // Merge the updates with existing event
  // Remove conflicting date/dateTime fields
  const updatedEvent = {
    ...existingEvent,
    summary: event.summary ?? existingEvent.summary,
    description: event.description ?? existingEvent.description,
  };

  // Handle start time - remove the opposite format
  if (event.start) {
    if ('dateTime' in event.start) {
      updatedEvent.start = { dateTime: event.start.dateTime, timeZone: event.start.timeZone };
    } else {
      updatedEvent.start = { date: event.start.date };
    }
  }

  // Handle end time - remove the opposite format
  if (event.end) {
    if ('dateTime' in event.end) {
      updatedEvent.end = { dateTime: event.end.dateTime, timeZone: event.end.timeZone };
    } else {
      updatedEvent.end = { date: event.end.date };
    }
  }

  console.log('Updating event with payload:', JSON.stringify(updatedEvent, null, 2));

  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedEvent),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Google Calendar API error:', errorData);
    throw new Error(
      errorData?.error?.message ||
      `Failed to update event: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string,
  calendarId: string = 'primary'
): Promise<void> {
  // Validate inputs
  validateCalendarId(calendarId);
  validateEventId(eventId);

  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message ||
      `Failed to delete event: ${response.status} ${response.statusText}`
    );
  }
}
