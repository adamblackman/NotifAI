import { useState, useEffect } from 'react';
import { UserProfile, MedalType } from '@/types/Goal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const calculateLevel = (xp: number): number => {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

const getMedalForCompletions = (completions: number): MedalType | null => {
  if (completions >= 100) return 'diamond';
  if (completions >= 50) return 'gold';
  if (completions >= 10) return 'silver';
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
      learn: [],
      save: [],
    },
  });
  const [goalsXPBreakdown, setGoalsXPBreakdown] = useState<{
    habit: number;
    project: number;
    learn: number;
    save: number;
  }>({
    habit: 0,
    project: 0,
    learn: 0,
    save: 0,
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
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('xp_earned, category')
        .eq('user_id', user.id);

      if (goalsError) throw goalsError;

      const totalXP = goalsData.reduce((sum, goal) => sum + (goal.xp_earned || 0), 0);
      const calculatedLevel = calculateLevel(totalXP);

      const breakdown = {
        habit: 0,
        project: 0,
        learn: 0,
        save: 0,
      };

      goalsData.forEach((goal) => {
        if (goal.category && goal.xp_earned) {
          breakdown[goal.category as keyof typeof breakdown] += goal.xp_earned;
        }
      });

      setProfile({
        id: profileData.id,
        xp: totalXP,
        level: calculatedLevel,
        medals: profileData.medals,
      });

      setGoalsXPBreakdown(breakdown);
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
            medals: newMedals,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
          .select()
          .single();

        if (error) throw error;

        await supabase
          .from('goals')
          .insert({
            user_id: user.id,
            title: `${medal.charAt(0).toUpperCase() + medal.slice(1)} Medal - ${category.charAt(0).toUpperCase() + category.slice(1)}`,
            description: `Medal bonus for ${category} achievements`,
            category: 'habit',
            xp_earned: medalXP,
            completed_at: new Date().toISOString(),
          });

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
    goalsXPBreakdown,
    addXP,
    checkAndAwardMedals,
    getXPForNextLevel,
    getLevelProgress,
    refetch: fetchProfile,
  };
}