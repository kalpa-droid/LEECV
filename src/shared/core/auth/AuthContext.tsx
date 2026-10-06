import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { UserProfile } from '../../../types/user';
import { getCurrentProfile, onAuthStateChange, login as authLogin, logout as authLogout, signup as authSignup } from './authService';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  login: typeof authLogin;
  signup: typeof authSignup;
  logout: typeof authLogout;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const currentProfile = await getCurrentProfile();
        if (mounted) {
          setProfile(currentProfile);
          // Supabase's getCurrentProfile returns profile and user combined internally, but we need to fetch user separately if we want just the user object.
          // Since getCurrentProfile relies on getUser(), we know the user is authenticated if profile is not null.
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
        login: authLogin,
        signup: authSignup,
        logout: authLogout,
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
