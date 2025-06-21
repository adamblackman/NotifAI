import { useEffect, useState } from "react";
import { Goal, GoalCategory } from "@/types/Goal";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchGoals();
    }
  }, [user]);

  const fetchGoals = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .order("order", { ascending: true });

      if (error) throw error;

      const transformedGoals = data.map(transformGoalFromDB);
      setGoals(transformedGoals);
    } catch (error) {
      console.error("Error fetching goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const createGoal = async (goalData: Partial<Goal>) => {
    if (!user) throw new Error("User not authenticated");

    try {
      // Get the highest order value for this user
      const { data: existingGoals } = await supabase
        .from("goals")
        .select("order")
        .eq("user_id", user.id)
        .order("order", { ascending: false })
        .limit(1);

      const nextOrder = existingGoals && existingGoals.length > 0
        ? (existingGoals[0].order || 0) + 1
        : 0;

      const dbGoal = transformGoalToDB(goalData, user.id);
      dbGoal.order = nextOrder;

      const { data, error } = await supabase
        .from("goals")
        .insert(dbGoal)
        .select()
        .single();

      if (error) throw error;

      const newGoal = transformGoalFromDB(data);
      setGoals((prev) => [newGoal, ...prev]);
      return newGoal;
    } catch (error) {
      console.error("Error creating goal:", error);
      throw error;
    }
  };

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    if (!user) throw new Error("User not authenticated");

    try {
      const { data: currentGoal, error: fetchError } = await supabase
        .from("goals")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (fetchError) throw fetchError;

      const dbUpdates: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) {
        dbUpdates.description = updates.description;
      }
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.completedAt !== undefined) {
        dbUpdates.completed_at = updates.completedAt
          ? updates.completedAt.toISOString()
          : null;
      }
      if (updates.xpEarned !== undefined) {
        dbUpdates.xp_earned = updates.xpEarned;
      }
      if (updates.order !== undefined) dbUpdates.order = updates.order;

      const existingData = currentGoal.data || {};
      const newData = extractGoalData(updates);
      const mergedData = { ...existingData, ...newData };

      if (Object.keys(newData).length > 0) {
        dbUpdates.data = mergedData;
      }

      const { data, error } = await supabase
        .from("goals")
        .update(dbUpdates)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      const updatedGoal = transformGoalFromDB(data);

      setGoals((prev) =>
        prev.map((goal) => goal.id === id ? updatedGoal : goal)
      );
      return updatedGoal;
    } catch (error) {
      console.error("Error updating goal:", error);
      fetchGoals();
      throw error;
    }
  };

  const deleteGoal = async (id: string) => {
    if (!user) throw new Error("User not authenticated");

    try {
      // Optimistically remove the goal from local state first
      setGoals((prev) => {
        const filtered = prev.filter((goal) => goal.id !== id);
        console.log("Optimistically removed goal, new count:", filtered.length);
        return filtered;
      });

      const { error } = await supabase
        .from("goals")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      console.log("Goal successfully deleted from database");
    } catch (error) {
      console.error("Error deleting goal:", error);
      // If deletion fails, refetch to restore the correct state
      fetchGoals();
      throw error;
    }
  };

  const completeGoal = async (id: string) => {
    if (!user) throw new Error("User not authenticated");

    try {
      const goal = goals.find((g) => g.id === id);
      if (!goal) throw new Error("Goal not found");

      const completionXP = 100;
      const newXpEarned = goal.xpEarned + completionXP;

      const { data, error } = await supabase
        .from("goals")
        .update({
          completed_at: new Date().toISOString(),
          xp_earned: newXpEarned,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      const completedGoal = transformGoalFromDB(data);
      setGoals((prev) =>
        prev.map((goal) => goal.id === id ? completedGoal : goal)
      );

      return completionXP;
    } catch (error) {
      console.error("Error completing goal:", error);
      throw error;
    }
  };

  const getGoalsByCategory = (category: GoalCategory) => {
    return goals.filter((goal) =>
      goal.category === category && !goal.completedAt
    );
  };

  const getActiveCategories = (): GoalCategory[] => {
    const categories = new Set(
      goals
        .filter((goal) => !goal.completedAt)
        .map((goal) => goal.category),
    );
    return Array.from(categories);
  };

  return {
    goals,
    loading,
    createGoal,
    updateGoal,
    deleteGoal,
    completeGoal,
    getGoalsByCategory,
    getActiveCategories,
    refetch: fetchGoals,
  };
}

function transformGoalFromDB(dbGoal: any): Goal {
  const baseGoal = {
    id: dbGoal.id,
    title: dbGoal.title,
    description: dbGoal.description,
    category: dbGoal.category,
    createdAt: new Date(dbGoal.created_at),
    completedAt: dbGoal.completed_at
      ? new Date(dbGoal.completed_at)
      : undefined,
    xpEarned: dbGoal.xp_earned,
    order: dbGoal.order || 0,
  };

  return { ...baseGoal, ...(dbGoal.data || {}) } as Goal;
}

function transformGoalToDB(goal: Partial<Goal>, userId: string) {
  const { id, createdAt, completedAt, xpEarned, order, ...rest } = goal;

  return {
    user_id: userId,
    title: goal.title!,
    description: goal.description || "",
    category: goal.category!,
    data: extractGoalData(goal),
    xp_earned: goal.xpEarned || 0,
    order: goal.order || 0,
  };
}

function extractGoalData(goal: Partial<Goal>) {
  const {
    id,
    title,
    description,
    category,
    createdAt,
    completedAt,
    xpEarned,
    order,
    ...data
  } = goal;
  return data;
}
