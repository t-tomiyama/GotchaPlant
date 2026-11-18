import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { migrateLegacyPlant } from '@/storage/plant-repository';
import { clearUserProfile, getUserProfile, saveUserProfile } from '@/storage/user-repository';

import type { UserProfile } from '@/types/user';

type SessionStatus = 'loading' | 'anonymous' | 'ready';

type UserSessionContextValue = {
  status: SessionStatus;
  profile: UserProfile | null;
  saveProfile: (profile: UserProfile) => Promise<void>;
  clearProfile: () => Promise<void>;
};

const UserSessionContext = createContext<UserSessionContextValue | null>(null);

export function UserSessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function loadSession() {
      await migrateLegacyPlant();
      const savedProfile = await getUserProfile();
      setProfile(savedProfile);
      setStatus(savedProfile ? 'ready' : 'anonymous');
    }
    loadSession();
  }, []);

  const value = useMemo<UserSessionContextValue>(
    () => ({
      status,
      profile,
      saveProfile: async (nextProfile) => {
        await saveUserProfile(nextProfile);
        setProfile(nextProfile);
        setStatus('ready');
      },
      clearProfile: async () => {
        await clearUserProfile();
        setProfile(null);
        setStatus('anonymous');
      },
    }),
    [status, profile],
  );

  return <UserSessionContext.Provider value={value}>{children}</UserSessionContext.Provider>;
}

export function useUserSession(): UserSessionContextValue {
  const context = useContext(UserSessionContext);
  if (!context) {
    throw new Error('useUserSession must be used within a UserSessionProvider');
  }
  return context;
}
