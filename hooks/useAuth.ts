import { useState, useEffect, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMountedRef.current) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMountedRef.current) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (!error && data.user) {
      // Create initial profile and preferences
      await createInitialUserData(data.user.id);
    }

    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  };

  const signOut = async () => {
    return await supabase.auth.signOut();
  };

  const createInitialUserData = async (userId: string) => {
    try {
      // Create profile
      await supabase.from('profiles').insert({
        id: userId,
        xp: 0,
        level: 1,
        medals: { habit: [], project: [], learning: [], saving: [] },
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
      console.error('Error creating initial user data:', error);
    }
  };

  return {
    session,
    user,
    loading,
    signUp,
    signIn,
    signOut,
  };
}