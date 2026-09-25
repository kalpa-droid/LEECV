import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { UserProfile } from '../../../types/user';
import { supabase } from '../lib/supabaseClient';
import { getCurrentProfile, signInWithGoogle, logout } from './authService';

interface AuthContextType {
  currentProfile: UserProfile | null;
  isLoggedIn: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  login: () => Promise<any>;
  logout: () => Promise<void>;
  user: UserProfile | null;
}

const AuthContext = createContext<AuthContextType>({
  currentProfile: null,
  isLoggedIn: false,
  loading: true,
  refreshProfile: async () => {},
  login: async () => {},
  logout: async () => {},
  user: null,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const profile = await getCurrentProfile();
      setCurrentProfile(profile);
    } catch (e) {
      console.error(e);
      setCurrentProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();

    // Sincronización entre pestañas y popup usando BroadcastChannel
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('leecv-auth');
      channel.onmessage = (event) => {
        if (event.data?.type === 'AUTH_COMPLETE') {
          refreshProfile();
        }
      };
    } catch (e) {
      // ignore
    }

    // Fallback con evento storage para navegadores que no soportan BroadcastChannel
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'leecv_auth_signal') {
        refreshProfile();
      }
    };
    window.addEventListener('storage', handleStorage);

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT') {
           refreshProfile();
        }
      });
      return () => {
        subscription.unsubscribe();
        if (channel) channel.close();
        window.removeEventListener('storage', handleStorage);
      };
    }

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return (
    <AuthContext.Provider value={{
      currentProfile,
      isLoggedIn: !!currentProfile,
      loading,
      refreshProfile,
      login: signInWithGoogle,
      logout,
      user: currentProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
