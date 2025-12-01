export type TaskPriority = 'low' | 'medium' | 'high';

// Project types
export interface Project {
  id: string;
  user_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectStatus {
  id: string;
  project_id: string;
  name: string;
  icon: string;
  color: string;
  position: number;
  created_at: string;
}

// Updated Task type with project and status references
export interface Task {
  id: string;
  user_id: string;
  project_id: string;
  status_id: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  scheduled_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface TimerPreset {
  id: string;
  user_id: string;
  name: string;
  duration_seconds: number;
  youtube_url: string | null;
  is_default: boolean;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  color: string;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      projects: {
        Row: Project;
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Project, 'id' | 'user_id' | 'created_at'>>;
      };
      project_statuses: {
        Row: ProjectStatus;
        Insert: Omit<ProjectStatus, 'id' | 'created_at'>;
        Update: Partial<Omit<ProjectStatus, 'id' | 'project_id' | 'created_at'>>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>;
      };
      timer_presets: {
        Row: TimerPreset;
        Insert: Omit<TimerPreset, 'id' | 'created_at'>;
        Update: Partial<Omit<TimerPreset, 'id' | 'user_id' | 'created_at'>>;
      };
      events: {
        Row: CalendarEvent;
        Insert: Omit<CalendarEvent, 'id' | 'created_at'>;
        Update: Partial<Omit<CalendarEvent, 'id' | 'user_id' | 'created_at'>>;
      };
      notes: {
        Row: Note;
        Insert: Omit<Note, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Note, 'id' | 'user_id' | 'created_at'>>;
      };
    };
  };
}
