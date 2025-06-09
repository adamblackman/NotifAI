import { useState, useEffect } from 'react';
import { UserProfile, MedalType } from '@/types/Goal';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

const calculateLevel = (xp: number): number => {
  // Exponential growth: level = floor(sqrt(xp / 100))
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

const getMedalForCompletions = (completions: number): MedalType | null => {
  if (completions >= 50) return 'diamond';
  if (completions >= 10) return 'gold';
  if (completions >= 5) return 'silver';
  if (completions >= 1) return 'bronze';
  return null;
};

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile>({
    id: '1',
    xp: 0,
    level: 1,
    medals: {
      habit: [],
      project: [],
      learning: [],
      saving: [],
    },
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile({
        id: data.id,
        xp: data.xp,
        level: data.level,
        medals: data.medals,
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const addXP = async (amount: number) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const newXP = profile.xp + amount;
      const newLevel = calculateLevel(newXP);

      const { data, error } = await supabase
        .from('profiles')
        .update({
          xp: newXP,
          level: newLevel,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(prev => ({
        ...prev,
        xp: newXP,
        level: newLevel,
      }));
    } catch (error) {
      console.error('Error adding XP:', error);
      throw error;
    }
  };

  const checkAndAwardMedals = async (category: string, completions: number) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const medal = getMedalForCompletions(completions);
      if (medal && !profile.medals[category as keyof typeof profile.medals].includes(medal)) {
        const medalXP = {
          bronze: 10,
          silver: 100,
          gold: 1000,
          diamond: 10000,
        }[medal];

        const newMedals = {
          ...profile.medals,
          [category]: [...profile.medals[category as keyof typeof profile.medals], medal],
        };

        const newXP = profile.xp + medalXP;
        const newLevel = calculateLevel(newXP);

        const { data, error } = await supabase
          .from('profiles')
          .update({
            xp: newXP,
            level: newLevel,
            medals: newMedals,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
          .select()
          .single();

        if (error) throw error;

        setProfile(prev => ({
          ...prev,
          xp: newXP,
          level: newLevel,
          medals: newMedals,
        }));

        return { medal, xp: medalXP };
      }
      return null;
    } catch (error) {
      console.error('Error checking medals:', error);
      throw error;
    }
  };

  const getXPForNextLevel = (): number => {
    const nextLevel = profile.level + 1;
    const xpForNextLevel = Math.pow(nextLevel - 1, 2) * 100;
    return xpForNextLevel - profile.xp;
  };

  const getLevelProgress = (): number => {
    const currentLevelXP = Math.pow(profile.level - 1, 2) * 100;
    const nextLevelXP = Math.pow(profile.level, 2) * 100;
    const levelXP = nextLevelXP - currentLevelXP;
    const earnedXP = profile.xp - currentLevelXP;
    return Math.max(0, Math.min(100, (earnedXP / levelXP) * 100));
  };

  return {
    profile,
    loading,
    addXP,
    checkAndAwardMedals,
    getXPForNextLevel,
    getLevelProgress,
    refetch: fetchProfile,
  };
}