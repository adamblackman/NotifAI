import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data?: any; error?: any }>;
  signUp: (email: string, password: string) => Promise<{ data?: any; error?: any }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setupNotificationsForNewUser: (userId: string, token?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get the current session
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          // Session error - user will need to sign in again
        }

        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setLoading(false);
        }

        // Store session info for quick access
        if (currentSession) {
          await AsyncStorage.setItem('hasValidSession', 'true');
        } else {
          await AsyncStorage.removeItem('hasValidSession');
        }
      } catch (error) {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setLoading(false);
        }

        // Update AsyncStorage based on session state
        if (currentSession) {
          await AsyncStorage.setItem('hasValidSession', 'true');
        } else {
          await AsyncStorage.removeItem('hasValidSession');
        }
      }
    );

    // Handle app state changes for better session management
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground, refresh session if needed
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
          if (mounted && currentSession) {
            setSession(currentSession);
            setUser(currentSession.user);
          }
        });
      }
    };

    // Add app state listener
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      appStateSubscription?.remove();
    };
  }, []);

  const setupNotificationsForNewUser = async (userId: string, token?: string) => {
    if (token) {
      try {
        const { error } = await supabase
          .from("device_tokens")
          .upsert(
            { user_id: userId, token },
            { onConflict: "token" },
          );

        if (error) {
          console.error("❌ Error saving push token during signup:", error);
        } else {
        }
      } catch (error) {
        console.error("❌ Exception saving push token during signup:", error);
      }
    } else {
    }
  };

  const signUp = async (email: string, password: string) => {
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (!error && data.user) {
        // Create initial profile and preferences
        await createInitialUserData(data.user.id);
      }

      return { data, error };
    } catch (error) {
      console.error("❌ Signup exception:", error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { data, error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // Clear any cached data
      await AsyncStorage.removeItem('hasValidSession');
    } catch (error) {
      // Handle signout error silently
    }
  };

  const refreshSession = async () => {
    try {
      await supabase.auth.refreshSession();
    } catch (error) {
      // Handle refresh error silently
    }
  };

  const createInitialUserData = async (userId: string) => {
    try {
      // Create profile
      await supabase.from('profiles').insert({
        id: userId,
        xp: 0,
        level: 1,
        medals: { habit: [], project: [], learn: [], save: [] },
      });

      // Create preferences
      await supabase.from('preferences').insert({
        user_id: userId,
        notification_window_start: 9,
        notification_window_end: 21,
        notification_days: [true, true, true, true, true, true, true],
        personality: 'friendly',
      });
    } catch (error) {
      // Handle user data creation error silently
    }
  };

  const value: AuthContextType = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
    refreshSession,
    setupNotificationsForNewUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 