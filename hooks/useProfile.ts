import { useEffect, useState } from "react";
import { MedalType, UserProfile } from "@/types/Goal";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Alert } from "react-native";

const calculateLevel = (xp: number): number => {
  if (typeof xp !== "number" || isNaN(xp) || xp < 0) {
    return 1; // Default to level 1 for invalid values
  }
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

export interface Profile {
  id: string;
  username: string;
  totalXP: number;
  level: number;
  phoneNumber?: string;
  countryCode?: string;
  achievements: { medal: string; category: string; awardedAt: string }[];
  xp: number;
  medals: {
    habit: string[];
    project: string[];
    learn: string[];
    save: string[];
  };
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile>({
    id: "",
    username: "",
    totalXP: 0,
    level: 1,
    achievements: [],
    xp: 0,
    medals: {
      habit: [],
      project: [],
      learn: [],
      save: [],
    },
  });
  const [loading, setLoading] = useState(true);
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

  const fetchProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get the user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);

        // If profile doesn't exist, create a default one
        if (profileError.code === "PGRST116") {
          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert([
              {
                id: user.id,
                username: user.email?.split("@")[0] || "User",
                total_xp: 0,
                level: 1,
                achievements: [],
              },
            ])
            .select()
            .single();

          if (createError) {
            console.error("Error creating profile:", createError);
            return;
          }

          setProfile({
            id: newProfile.id,
            username: newProfile.username,
            totalXP: newProfile.total_xp,
            level: newProfile.level,
            phoneNumber: newProfile.phone_number,
            countryCode: newProfile.country_code,
            achievements: newProfile.achievements || [],
            xp: newProfile.total_xp,
            medals: {
              habit: [],
              project: [],
              learn: [],
              save: [],
            },
          });
        }
        return;
      }

      // Get goals data for XP breakdown
      const { data: goalsData, error: goalsError } = await supabase
        .from("goals")
        .select("xp_earned, category")
        .eq("user_id", user.id);

      if (goalsError) {
        console.error("Error fetching goals:", goalsError);
      }

      const breakdown = {
        habit: 0,
        project: 0,
        learn: 0,
        save: 0,
      };

      if (goalsData) {
        goalsData.forEach((goal) => {
          if (goal.category && goal.xp_earned) {
            breakdown[goal.category as keyof typeof breakdown] +=
              goal.xp_earned;
          }
        });
      }

      setGoalsXPBreakdown(breakdown);

      // Convert achievements to legacy medal format
      const medals: {
        habit: string[];
        project: string[];
        learn: string[];
        save: string[];
      } = {
        habit: [],
        project: [],
        learn: [],
        save: [],
      };

      const achievements = profileData.achievements || [];
      // For now, just mark completion medals as bronze
      achievements.forEach((achievement: any) => {
        if (achievement.medal.endsWith("_completion")) {
          const category = achievement.category;
          if (medals[category as keyof typeof medals]) {
            medals[category as keyof typeof medals].push("bronze");
          }
        }
      });

      setProfile({
        id: profileData.id,
        username: profileData.username,
        totalXP: profileData.total_xp || 0,
        level: profileData.level || 1,
        phoneNumber: profileData.phone_number,
        countryCode: profileData.country_code,
        achievements: profileData.achievements || [],
        xp: profileData.total_xp || 0,
        medals,
      });

      setAchievementXP(0); // No achievement XP for now
    } catch (error) {
      console.error("Error in fetchProfile:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const updateProfile = async (updates: {
    username?: string;
    phoneNumber?: string;
    countryCode?: string;
  }) => {
    if (!user) throw new Error("User not authenticated");

    try {
      const updateData: any = {};

      if (updates.username !== undefined) {
        updateData.username = updates.username;
      }

      if (updates.phoneNumber !== undefined) {
        updateData.phone_number = updates.phoneNumber;
      }

      if (updates.countryCode !== undefined) {
        updateData.country_code = updates.countryCode;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

      if (error) {
        console.error("Error updating profile:", error);
        throw error;
      }

      // Update local state
      setProfile((prev) => ({
        ...prev,
        ...(updates.username !== undefined && { username: updates.username }),
        ...(updates.phoneNumber !== undefined &&
          { phoneNumber: updates.phoneNumber }),
        ...(updates.countryCode !== undefined &&
          { countryCode: updates.countryCode }),
      }));
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  const syncProfileXPToGoals = async () => {
    if (!user) return;

    try {
      // Get all goals for the user
      const { data: goals, error: goalsError } = await supabase
        .from("goals")
        .select("xp_earned")
        .eq("user_id", user.id);

      if (goalsError) {
        console.error("Error fetching goals for XP sync:", goalsError);
        return;
      }

      // Calculate total XP from all goals
      const totalXP = goals?.reduce((sum, goal) =>
        sum + (goal.xp_earned || 0), 0) || 0;

      // Calculate level (every 100 XP = 1 level)
      const level = Math.floor(totalXP / 100) + 1;

      // Update profile with new totals
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          total_xp: totalXP,
          level: level,
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Error updating profile XP:", updateError);
        return;
      }

      // Update local state
      setProfile((prev) => ({
        ...prev,
        totalXP,
        level,
        xp: totalXP, // Legacy compatibility
      }));
    } catch (error) {
      console.error("Error in syncProfileXPToGoals:", error);
    }
  };

  const awardMedalForGoalCompletion = async (category: string) => {
    if (!user) return;

    try {
      const medal = `${category}_completion`;

      // Check if user already has this medal
      const existingMedal = profile.achievements.find(
        (achievement) => achievement.medal === medal,
      );

      if (existingMedal) {
        return; // Already has this medal
      }

      const newAchievement = {
        medal,
        category,
        awardedAt: new Date().toISOString(),
      };

      const updatedAchievements = [...profile.achievements, newAchievement];

      // Update database
      const { error } = await supabase
        .from("profiles")
        .update({
          achievements: updatedAchievements,
        })
        .eq("id", user.id);

      if (error) {
        console.error("Error awarding medal:", error);
        return;
      }

      // Update local state
      setProfile((prev) => ({
        ...prev,
        achievements: updatedAchievements,
      }));

      // Show success message
      Alert.alert(
        "Achievement Unlocked! 🏆",
        `You've earned the ${
          category.charAt(0).toUpperCase() + category.slice(1)
        } Completion medal!`,
        [{ text: "Awesome!" }],
      );
    } catch (error) {
      console.error("Error in awardMedalForGoalCompletion:", error);
    }
  };

  const getLevelProgress = (): number => {
    const currentLevelXP = (profile.level - 1) * 100;
    const nextLevelXP = profile.level * 100;
    const levelXP = nextLevelXP - currentLevelXP;
    const earnedXP = profile.xp - currentLevelXP;
    return Math.max(0, Math.min(100, (earnedXP / levelXP) * 100));
  };

  const getXPForNextLevel = (): number => {
    const nextLevelXP = profile.level * 100;
    return Math.max(0, nextLevelXP - profile.xp);
  };

  return {
    profile,
    loading,
    goalsXPBreakdown,
    achievementXP,
    updateProfile,
    syncProfileXPToGoals,
    awardMedalForGoalCompletion,
    refreshProfile: fetchProfile,
    refetch: fetchProfile, // Legacy compatibility
    getLevelProgress,
    getXPForNextLevel,
  };
}
