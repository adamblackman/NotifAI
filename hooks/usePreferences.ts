import { useEffect, useState } from "react";
import { Preferences } from "@/types/Goal";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>({
    notificationWindow: {
      start: 9, // 9 AM
      end: 21, // 9 PM
    },
    notificationDays: new Array(7).fill(true), // All days selected by default
    personality: "friendly",
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      setPreferences({
        notificationWindow: {
          start: data.notification_window_start,
          end: data.notification_window_end,
        },
        notificationDays: data.notification_days,
        personality: data.personality,
      });
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationWindow = async (start: number, end: number) => {
    if (!user) throw new Error("User not authenticated");

    try {
      const { error } = await supabase
        .from("preferences")
        .update({
          notification_window_start: start,
          notification_window_end: end,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setPreferences((prev) => ({
        ...prev,
        notificationWindow: { start, end },
      }));
    } catch (error) {
      console.error("Error updating notification window:", error);
      throw error;
    }
  };

  const updateNotificationDays = async (days: boolean[]) => {
    if (!user) throw new Error("User not authenticated");

    try {
      const { error } = await supabase
        .from("preferences")
        .update({
          notification_days: days,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setPreferences((prev) => ({
        ...prev,
        notificationDays: days,
      }));
    } catch (error) {
      console.error("Error updating notification days:", error);
      throw error;
    }
  };

  const updatePersonality = async (personality: Preferences["personality"]) => {
    if (!user) throw new Error("User not authenticated");

    try {
      const { error } = await supabase
        .from("preferences")
        .update({
          personality,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setPreferences((prev) => ({
        ...prev,
        personality,
      }));
    } catch (error) {
      console.error("Error updating personality:", error);
      throw error;
    }
  };

  return {
    preferences,
    loading,
    updateNotificationWindow,
    updateNotificationDays,
    updatePersonality,
    refetch: fetchPreferences,
  };
}
