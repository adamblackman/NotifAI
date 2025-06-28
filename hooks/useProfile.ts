import { useEffect, useState } from "react";
import { MedalType, UserProfile } from "@/types/Goal";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const calculateLevel = (xp: number): number => {
  if (typeof xp !== "number" || isNaN(xp) || xp < 0) {
    return 1; // Default to level 1 for invalid values
  }
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile & { 
    phoneNumber?: string; 
    countryCode?: string; 
    email?: string; 
  }>({
    id: "1",
    xp: 0,
    level: 1,
    medals: {
      habit: [],
      project: [],
      learn: [],
      save: [],
    },
    phoneNumber: '',
    countryCode: '',
    email: '',
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
  const [achievementXP, setAchievementXP] = useState(0);
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
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      const { data: goalsData, error: goalsError } = await supabase
        .from("goals")
        .select("xp_earned, category")
        .eq("user_id", user.id);

      if (goalsError) throw goalsError;

      const goalsXP = goalsData.reduce(
        (sum, goal) => sum + (goal.xp_earned || 0),
        0,
      );

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

      // Calculate achievement XP from medals
      const medals = profileData.medals ||
        { habit: [], project: [], learn: [], save: [] };
      const medalXPValues = {
        bronze: 10,
        silver: 100,
        gold: 1000,
        diamond: 10000,
      };

      const achievementsXP = Object.values(medals).flat().reduce(
        (sum: number, medal) => {
          return sum +
            (medalXPValues[medal as keyof typeof medalXPValues] || 0);
        },
        0,
      );

      const totalXP = goalsXP + achievementsXP;
      const calculatedLevel = calculateLevel(totalXP);

      setProfile({
        id: profileData.id,
        xp: totalXP,
        level: calculatedLevel,
        medals: medals,
        phoneNumber: profileData.phone_number || '',
        countryCode: profileData.country_code || '',
        email: profileData.email || user.email || '',
      });

      setGoalsXPBreakdown(breakdown);
      setAchievementXP(achievementsXP);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: {
    phoneNumber?: string;
    countryCode?: string;
    email?: string;
  }) => {
    if (!user) throw new Error("User not authenticated");

    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.phoneNumber !== undefined) {
        updateData.phone_number = updates.phoneNumber;
      }
      if (updates.countryCode !== undefined) {
        updateData.country_code = updates.countryCode;
      }
      if (updates.email !== undefined) {
        updateData.email = updates.email;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

      if (error) throw error;

      // Update local state
      setProfile(prev => ({
        ...prev,
        ...updates,
      }));
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  const syncProfileXPToGoals = async () => {
    if (!user) throw new Error("User not authenticated");

    try {
      // Get total XP from all goals
      const { data: goalsData, error: goalsError } = await supabase
        .from("goals")
        .select("xp_earned")
        .eq("user_id", user.id);

      if (goalsError) throw goalsError;

      const goalsXP = goalsData.reduce(
        (sum, goal) => sum + (goal.xp_earned || 0),
        0,
      );

      // Add achievement XP to total
      const totalXP = goalsXP + achievementXP;
      const newLevel = calculateLevel(totalXP);

      // Validate the calculated values before database update
      if (typeof newLevel !== "number" || isNaN(newLevel) || newLevel < 1) {
        throw new Error(
          `Invalid level calculated: ${newLevel} for XP: ${totalXP}`,
        );
      }

      // Update local state immediately
      setProfile((prev) => ({
        ...prev,
        xp: totalXP,
        level: newLevel,
      }));

      // Update the profile in the database
      const { error } = await supabase
        .from("profiles")
        .update({
          xp: totalXP,
          level: newLevel,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        console.error("Error syncing profile XP to database:", error);
        // Revert local state on error
        await fetchProfile();
        throw error;
      }
    } catch (error) {
      console.error("Error syncing profile XP:", error);
      throw error;
    }
  };

  const addXP = async (amount: number) => {
    if (!user) throw new Error("User not authenticated");

    try {
      // Ensure we have valid current values
      const currentXP = typeof profile.xp === "number" ? profile.xp : 0;
      const newXP = Math.max(0, currentXP + amount); // Never let XP go below 0
      const newLevel = calculateLevel(newXP);

      // Validate the calculated values before database update
      if (typeof newLevel !== "number" || isNaN(newLevel) || newLevel < 1) {
        throw new Error(
          `Invalid level calculated: ${newLevel} for XP: ${newXP}`,
        );
      }

      // Update local state optimistically
      setProfile((prev) => ({
        ...prev,
        xp: newXP,
        level: newLevel,
      }));

      // Update the profile in the database
      const { error } = await supabase
        .from("profiles")
        .update({
          xp: newXP,
          level: newLevel,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        console.error("Error updating profile XP in database:", error);
        // Revert local state on error
        setProfile((prev) => ({
          ...prev,
          xp: currentXP,
          level: calculateLevel(currentXP),
        }));
        throw error;
      }
    } catch (error) {
      console.error("Error adding XP:", error);
      throw error;
    }
  };

  const checkAndAwardMedals = async (category: string, completions: number) => {
    if (!user) throw new Error("User not authenticated");

    try {
      // Only award medals when entire goals are completed, not individual tasks
      // This function is kept for compatibility but should only be called for goal completion
      return null;
    } catch (error) {
      console.error("Error checking medals:", error);
      throw error;
    }
  };

  const awardMedalForGoalCompletion = async (category: string) => {
    if (!user) throw new Error("User not authenticated");

    try {
      // Get completed goals count for this category
      const { data: completedGoals, error } = await supabase
        .from("goals")
        .select("id")
        .eq("user_id", user.id)
        .eq("category", category)
        .not("completed_at", "is", null);

      if (error) throw error;

      const completedCount = completedGoals.length;
      let newMedal: MedalType | null = null;

      // Determine the highest medal that should be awarded
      if (completedCount >= 100) newMedal = "diamond";
      else if (completedCount >= 50) newMedal = "gold";
      else if (completedCount >= 10) newMedal = "silver";
      else if (completedCount >= 1) newMedal = "bronze";

      if (!newMedal) return null;

      const currentMedals =
        profile.medals[category as keyof typeof profile.medals];

      // Check if we need to award any new medals
      const medalsToAward: MedalType[] = [];
      const medalOrder: MedalType[] = ["bronze", "silver", "gold", "diamond"];

      for (const medal of medalOrder) {
        if (!currentMedals.includes(medal)) {
          medalsToAward.push(medal);
        }
        if (medal === newMedal) break;
      }

      if (medalsToAward.length === 0) return null;

      const medalXP = {
        bronze: 10,
        silver: 100,
        gold: 1000,
        diamond: 10000,
      };

      const totalXP = medalsToAward.reduce(
        (sum, medal) => sum + medalXP[medal],
        0,
      );

      const newMedals = {
        ...profile.medals,
        [category]: [...currentMedals, ...medalsToAward],
      };

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          medals: newMedals,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Update achievement XP and total XP when medals are awarded
      const newAchievementXP = achievementXP + totalXP;
      const newTotalXP = profile.xp + totalXP;
      const newLevel = calculateLevel(newTotalXP);

      setProfile((prev) => ({
        ...prev,
        medals: newMedals,
        xp: newTotalXP,
        level: newLevel,
      }));

      setAchievementXP(newAchievementXP);

      // Update database with new total XP and level
      await supabase
        .from("profiles")
        .update({
          xp: newTotalXP,
          level: newLevel,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      return { medals: medalsToAward, xp: totalXP };
    } catch (error) {
      console.error("Error awarding medal:", error);
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
    achievementXP,
    addXP,
    updateProfile,
    syncProfileXPToGoals,
    checkAndAwardMedals,
    awardMedalForGoalCompletion,
    getXPForNextLevel,
    getLevelProgress,
    refetch: fetchProfile,
  };
}