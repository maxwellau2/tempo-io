import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { APP_CONFIG } from '@/lib/constants';

type Mode = 'personal' | 'team';

interface TeamStore {
  mode: Mode;
  activeTeamId: string | null;
  activeTeamName: string | null;
  setMode: (mode: Mode) => void;
  setActiveTeam: (teamId: string | null) => void;
  switchToPersonal: () => void;
  switchToTeam: (teamId: string, teamName: string) => void;
}

export const useTeamStore = create<TeamStore>()(
  persist(
    (set) => ({
      mode: 'personal',
      activeTeamId: null,
      activeTeamName: null,

      setMode: (mode) => set({ mode }),

      setActiveTeam: (teamId) => set({ activeTeamId: teamId }),

      switchToPersonal: () => set({ mode: 'personal', activeTeamId: null, activeTeamName: null }),

      switchToTeam: (teamId, teamName) => set({ mode: 'team', activeTeamId: teamId, activeTeamName: teamName }),
    }),
    {
      name: `${APP_CONFIG.storagePrefix}-team-mode`,
    }
  )
);
