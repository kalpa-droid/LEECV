import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { UserProfile } from '../../../types/user';
import { supabase } from '../lib/supabaseClient';
import { getCurrentProfile, capturarConexionDriveSiCorresponde } from './authService';

interface AuthContextType {
  currentProfile: UserProfile | null;
  isLoggedIn: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentProfile: null,
  isLoggedIn: false,
  loading: true,
  refreshProfile: async () => {},
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
    // If popup completed login, it might close itself or we might check here
    if (window.opener && window.name === 'google-oauth-popup') {
      supabase?.auth.getSession().then(({ data }) => {
        if (data?.session) {
          window.close();
        }
      });
    }

    refreshProfile();

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
           capturarConexionDriveSiCorresponde(session);
        }
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT') {
           refreshProfile();
           if (window.opener && window.name === 'google-oauth-popup' && event === 'SIGNED_IN') {
             window.close();
           }
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      currentProfile,
      isLoggedIn: !!currentProfile,
      loading,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
