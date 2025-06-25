import { useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const SUPABASE_URL = "https://uhnvncqogcfgkdhlvmzq.supabase.co";

export function useDeleteAccount() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const deleteAccount = async (): Promise<void> => {
    if (!user) {
      throw new Error("No user found");
    }

    setLoading(true);

    try {
      // Delete scheduled notifications
      const { error: notificationsError } = await supabase
        .from("scheduled_notifications")
        .delete()
        .eq("user_id", user.id);

      if (notificationsError) {
        console.error("Error deleting notifications:", notificationsError);
        throw new Error("Failed to delete notification data");
      }

      // Delete device tokens
      const { error: tokensError } = await supabase
        .from("device_tokens")
        .delete()
        .eq("user_id", user.id);

      if (tokensError) {
        console.error("Error deleting device tokens:", tokensError);
        throw new Error("Failed to delete device token data");
      }

      // Delete goals (this will cascade to related data)
      const { error: goalsError } = await supabase
        .from("goals")
        .delete()
        .eq("user_id", user.id);

      if (goalsError) {
        console.error("Error deleting goals:", goalsError);
        throw new Error("Failed to delete goals data");
      }

      // Delete preferences
      const { error: preferencesError } = await supabase
        .from("preferences")
        .delete()
        .eq("user_id", user.id);

      if (preferencesError) {
        console.error("Error deleting preferences:", preferencesError);
        throw new Error("Failed to delete preferences data");
      }

      // Delete profile
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", user.id);

      if (profileError) {
        console.error("Error deleting profile:", profileError);
        throw new Error("Failed to delete profile data");
      }

      // Step 2: Delete the authentication record via Edge Function

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error("No valid session found");
        }

        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/delete-user`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete user from auth");
        }
      } catch (authError) {
        console.error("Error deleting auth user:", authError);
        // Continue with local cleanup even if auth deletion fails
        console.warn("⚠️ Auth deletion failed, continuing with local cleanup");
      }

      // Step 3: Clear local storage and session data

      try {
        await AsyncStorage.clear();
      } catch (storageError) {
        console.error("Error clearing local storage:", storageError);
        // Continue even if local storage clearing fails
      }

      // Step 4: Sign out from Supabase

      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error("Error signing out:", signOutError);
        // Continue even if sign out fails
      }
    } catch (error) {
      console.error("❌ Account deletion failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    deleteAccount,
    loading,
  };
}
