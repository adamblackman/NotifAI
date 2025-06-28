import { useEffect, useState } from "react";
import { Goal, GoalCategory } from "@/types/Goal";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useGuest } from "@/contexts/GuestContext";

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { isGuestMode, guestGoals, updateGuestGoal } = useGuest();

  useEffect(() => {
    if (user && !isGuestMode) {
      fetchGoals();
    } else if (isGuestMode) {
      setLoading(false);
    }
  }, [user, isGuestMode]);

  const fetchGoals = async () => {
    if (!user || isGuestMode) return;

    try {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

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
    if (isGuestMode) {
      // This shouldn't be called in guest mode, but handle it gracefully
      return null;
    }

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
    if (isGuestMode) {
      // Update guest goal locally
      updateGuestGoal(id, updates);
      return guestGoals.find((g) => g.id === id);
    }

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
      if (updates.notificationChannels !== undefined) {
        dbUpdates.notification_channels = updates.notificationChannels;
      }

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
    if (isGuestMode) {
      // This is handled in the context
      return;
    }

    if (!user) throw new Error("User not authenticated");

    try {
      // Optimistically remove the goal from local state first
      setGoals((prev) => {
        const filtered = prev.filter((goal) => goal.id !== id);
        return filtered;
      });

      const { error } = await supabase
        .from("goals")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting goal:", error);
      // If deletion fails, refetch to restore the correct state
      fetchGoals();
      throw error;
    }
  };

  const completeGoal = async (id: string) => {
    if (isGuestMode) {
      // Handle guest goal completion locally
      const goal = guestGoals.find((g) => g.id === id);
      if (goal) {
        updateGuestGoal(id, {
          completedAt: new Date(),
          xpEarned: goal.xpEarned + 100,
        });
      }
      return 100;
    }

    if (!user) throw new Error("User not authenticated");

    try {
      const goal = goals.find((g) => g.id === id);
      if (!goal) throw new Error("Goal not found");

      const completionXP = 100; // Exactly 100 XP for any goal completion
      const newXpEarned = goal.xpEarned + completionXP;

      // Update goal as completed with XP
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
    const currentGoals = isGuestMode ? guestGoals : goals;
    return currentGoals.filter((goal) =>
      goal.category === category && !goal.completedAt
    );
  };

  const getActiveCategories = (): GoalCategory[] => {
    const currentGoals = isGuestMode ? guestGoals : goals;
    const categories = new Set(
      currentGoals
        .filter((goal) => !goal.completedAt)
        .map((goal) => goal.category),
    );
    return Array.from(categories);
  };

  const checkAndCompleteGoal = async (goal: Goal): Promise<boolean> => {
    if (goal.completedAt) return false; // Already completed

    let shouldComplete = false;

    switch (goal.category) {
      case "habit": {
        const habitGoal = goal as any;
        const completedDays = habitGoal.completedDates?.length || 0;
        const targetDays = habitGoal.targetDays || 0;
        shouldComplete = completedDays >= targetDays && targetDays > 0;
        break;
      }
      case "save": {
        const saveGoal = goal as any;
        const currentAmount = saveGoal.currentAmount || 0;
        const targetAmount = saveGoal.targetAmount || 0;
        shouldComplete = currentAmount >= targetAmount && targetAmount > 0;
        break;
      }
      case "project": {
        const projectGoal = goal as any;
        const tasks = projectGoal.tasks || [];
        const completedTasks = tasks.filter((task: any) => task.completed);
        shouldComplete = tasks.length > 0 &&
          completedTasks.length === tasks.length;
        break;
      }
      case "learn": {
        const learnGoal = goal as any;
        const curriculumItems = learnGoal.curriculumItems || [];
        const completedItems = curriculumItems.filter((item: any) =>
          item.completed
        );
        shouldComplete = curriculumItems.length > 0 &&
          completedItems.length === curriculumItems.length;
        break;
      }
    }

    if (shouldComplete) {
      await completeGoal(goal.id);
      return true;
    }

    return false;
  };

  const isGoalCompleted = (goal: Goal): boolean => {
    if (goal.completedAt) return true;

    switch (goal.category) {
      case "habit": {
        const habitGoal = goal as any;
        const completedDays = habitGoal.completedDates?.length || 0;
        const targetDays = habitGoal.targetDays || 0;
        return completedDays >= targetDays && targetDays > 0;
      }
      case "save": {
        const saveGoal = goal as any;
        const currentAmount = saveGoal.currentAmount || 0;
        const targetAmount = saveGoal.targetAmount || 0;
        return currentAmount >= targetAmount && targetAmount > 0;
      }
      case "project": {
        const projectGoal = goal as any;
        const tasks = projectGoal.tasks || [];
        const completedTasks = tasks.filter((task: any) => task.completed);
        return tasks.length > 0 && completedTasks.length === tasks.length;
      }
      case "learn": {
        const learnGoal = goal as any;
        const curriculumItems = learnGoal.curriculumItems || [];
        const completedItems = curriculumItems.filter((item: any) =>
          item.completed
        );
        return curriculumItems.length > 0 &&
          completedItems.length === curriculumItems.length;
      }
      default:
        return false;
    }
  };

  const getGoalsSortedByCompletion = (category?: GoalCategory): Goal[] => {
    const currentGoals = isGuestMode ? guestGoals : goals;
    let filteredGoals = category
      ? currentGoals.filter((g) => g.category === category)
      : currentGoals;

    // Sort: incomplete goals first, then completed goals
    return filteredGoals.sort((a, b) => {
      const aCompleted = isGoalCompleted(a);
      const bCompleted = isGoalCompleted(b);

      if (aCompleted === bCompleted) {
        // Sort by updated_at in descending order (most recently updated first)
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      }

      return aCompleted ? 1 : -1; // Incomplete goals first
    });
  };

  return {
    goals: isGuestMode ? guestGoals : goals,
    loading,
    createGoal,
    updateGoal,
    deleteGoal,
    completeGoal,
    checkAndCompleteGoal,
    isGoalCompleted,
    getGoalsByCategory,
    getGoalsSortedByCompletion,
    getActiveCategories,
    refetch: fetchGoals,
  };
}

function transformGoalFromDB(dbGoal: any): Goal {
  // Ensure we have valid dates
  const createdAt = new Date(dbGoal.created_at);
  const updatedAt = dbGoal.updated_at
    ? new Date(dbGoal.updated_at)
    : new Date(dbGoal.created_at);

  const baseGoal = {
    id: dbGoal.id,
    title: dbGoal.title,
    description: dbGoal.description,
    category: dbGoal.category,
    createdAt,
    updatedAt,
    completedAt: dbGoal.completed_at
      ? new Date(dbGoal.completed_at)
      : undefined,
    xpEarned: dbGoal.xp_earned,
    order: dbGoal.order || 0,
  };

  // First get the data, then ensure base properties aren't overwritten
  const goalData = dbGoal.data || {};
  const result = {
    ...goalData,
    ...baseGoal, // Base properties come last to ensure they're not overwritten
  } as Goal;

  return result;
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
    updatedAt,
    completedAt,
    xpEarned,
    order,
    ...data
  } = goal;
  return data;
}
