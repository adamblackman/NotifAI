import { supabase } from "./supabase";

export async function generateGoalFromThought(
  thoughtInput: string,
  isGuest: boolean = false,
): Promise<any[]> {
  try {
    if (isGuest) {
      // For guest users, call the edge function without auth headers
      const { data, error } = await supabase.functions.invoke("generate-goal", {
        body: { thoughtInput, isGuest: true },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error("Failed to generate goals");
      }

      if (!data?.goals || !Array.isArray(data.goals)) {
        throw new Error("Invalid response from goal generation service");
      }

      return data.goals;
    } else {
      // For authenticated users, include auth headers
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase.functions.invoke("generate-goal", {
        body: { thoughtInput, isGuest: false },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error("Failed to generate goals");
      }

      if (!data?.goals || !Array.isArray(data.goals)) {
        throw new Error("Invalid response from goal generation service");
      }

      return data.goals;
    }
  } catch (error) {
    console.error("Error generating goals from thought:", error);
    throw error;
  }
}
