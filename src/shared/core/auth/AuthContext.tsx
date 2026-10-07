import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { UserProfile } from '../../../types/user';
import { getCurrentProfile, onAuthStateChange, login as authLogin, logout as authLogout, signup as authSignup, resetPasswordForEmail as authResetPassword, updatePassword as authUpdatePassword } from './authService';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  login: typeof authLogin;
  signup: typeof authSignup;
  logout: typeof authLogout;
  resetPasswordForEmail: typeof authResetPassword;
  updatePassword: typeof authUpdatePassword;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

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

    const { data: authListener } = onAuthStateChange(async (sessionUser, event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      } else if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
      }

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
        isPasswordRecovery,
        login: authLogin,
        signup: authSignup,
        logout: authLogout,
        resetPasswordForEmail: authResetPassword,
        updatePassword: authUpdatePassword,
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
