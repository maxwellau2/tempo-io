export type TaskPriority = 'low' | 'medium' | 'high';
export type TeamRole = 'leader' | 'admin' | 'member';
export type RequestStatus = 'pending' | 'accepted' | 'rejected';
export type MessageType = 'text' | 'meet' | 'link';

// Project types
export interface Project {
  id: string;
  user_id: string;
  team_id: string | null;
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
  team_id: string | null;
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
  team_id: string | null;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// Team types
export interface Team {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
  profile?: Profile;
}

export interface TeamWithMembers extends Team {
  members: TeamMember[];
}

export interface TeamJoinRequest {
  id: string;
  team_id: string;
  user_id: string;
  status: RequestStatus;
  created_at: string;
  resolved_by: string | null;
  resolved_at: string | null;
  profile?: Profile;
  team?: Team;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  invited_email: string;
  invited_user_id: string | null;
  invited_by: string;
  status: RequestStatus;
  created_at: string;
  resolved_at: string | null;
  team?: Team;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

export interface TeamMessage {
  id: string;
  team_id: string;
  user_id: string;
  content: string;
  type: MessageType;
  metadata: { meet_link?: string; link_url?: string; link_title?: string } | null;
  edited_at: string | null;
  created_at: string;
  profile?: Profile;
}

export interface TeamEvent {
  id: string;
  team_id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  color: string;
  created_at: string;
  updated_at: string;
  profile?: Profile;
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
      teams: {
        Row: Team;
        Insert: Omit<Team, 'id' | 'invite_code' | 'created_at' | 'updated_at'>;
        Update: Partial<Pick<Team, 'name' | 'description'>>;
      };
      team_members: {
        Row: TeamMember;
        Insert: Omit<TeamMember, 'id' | 'joined_at'>;
        Update: Partial<Pick<TeamMember, 'role'>>;
      };
      team_join_requests: {
        Row: TeamJoinRequest;
        Insert: Pick<TeamJoinRequest, 'team_id' | 'user_id'>;
        Update: Partial<Pick<TeamJoinRequest, 'status' | 'resolved_by' | 'resolved_at'>>;
      };
      team_invitations: {
        Row: TeamInvitation;
        Insert: Pick<TeamInvitation, 'team_id' | 'invited_email' | 'invited_by'>;
        Update: Partial<Pick<TeamInvitation, 'status' | 'resolved_at'>>;
      };
      team_messages: {
        Row: TeamMessage;
        Insert: Omit<TeamMessage, 'id' | 'edited_at' | 'created_at'>;
        Update: Partial<Pick<TeamMessage, 'content' | 'edited_at'>>;
      };
      team_events: {
        Row: TeamEvent;
        Insert: Omit<TeamEvent, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TeamEvent, 'id' | 'team_id' | 'user_id' | 'created_at'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'>;
        Update: Partial<Pick<Notification, 'read'>>;
      };
    };
  };
}
