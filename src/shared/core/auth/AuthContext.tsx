import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { UserProfile } from '../../../types/user';
import { supabase } from '../lib/supabaseClient';
import { getCurrentProfile, onAuthStateChange, login as authLogin, logout as authLogout, signup as authSignup, requestOtp as authRequestOtp, verifyOtp as authVerifyOtp } from './authService';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  signup: (email: string, password: string, fullName?: string) => Promise<{ user: User | null; session: any }>;
  logout: () => Promise<void>;
  /** Envía el código de un solo uso al email (ingreso sin contraseña). */
  requestOtp: typeof authRequestOtp;
  /** Confirma el código recibido y deja la sesión iniciada. */
  verifyOtp: typeof authVerifyOtp;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Confirmar el código del email deja la sesión lista; se refleja en el estado
  // sin esperar al evento de Supabase, así la pantalla puede seguir de inmediato.
  const verifyOtp = useCallback(async (email: string, token: string) => {
    const result = await authVerifyOtp(email, token);
    if (result.user) {
      setUser(result.user);
      const p = await getCurrentProfile();
      setProfile(p);
    }
    return result;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const loggedUser = await authLogin(email, password);
    if (loggedUser) {
      setUser(loggedUser);
      const p = await getCurrentProfile();
      setProfile(p);
    }
    return loggedUser;
  }, []);

  const signup = useCallback(async (email: string, password: string, fullName?: string) => {
    const result = await authSignup(email, password, fullName);
    if (result.user && result.session) {
      setUser(result.user);
      const p = await getCurrentProfile();
      setProfile(p);
    }
    return result;
  }, []);

  const logout = useCallback(async () => {
    await authLogout();
    setUser(null);
    setProfile(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        if (supabase) {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (mounted && currentUser) {
            setUser(currentUser);
            const currentProfile = await getCurrentProfile();
            if (mounted) setProfile(currentProfile);
          }
        }
      } catch (error) {
        console.error('Error in initAuth:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    const { data: authListener } = onAuthStateChange(async (sessionUser) => {
      setUser(sessionUser);
      if (sessionUser) {
        const p = await getCurrentProfile();
        if (mounted) setProfile(p);
      } else {
        if (mounted) setProfile(null);
      }
      if (mounted) setIsLoading(false);
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        login,
        signup,
        logout,
        requestOtp: authRequestOtp,
        verifyOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
