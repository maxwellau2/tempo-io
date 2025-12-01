export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: Date;
  endDate?: Date;
  isAllDay: boolean;
  isGoogleEvent: boolean;
  color: string;
}

export interface EventFormData {
  title: string;
  description: string;
  date: string;
  isAllDay: boolean;
  startTime: string;
  endTime: string;
  color: string;
}
