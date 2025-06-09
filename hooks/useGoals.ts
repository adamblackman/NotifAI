import { useState, useEffect } from 'react';
import { Goal, GoalCategory } from '@/types/Goal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

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
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedGoals = data.map(transformGoalFromDB);
      setGoals(transformedGoals);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const createGoal = async (goalData: Partial<Goal>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const dbGoal = transformGoalToDB(goalData, user.id);
      
      const { data, error } = await supabase
        .from('goals')
        .insert(dbGoal)
        .select()
        .single();

      if (error) throw error;

      const newGoal = transformGoalFromDB(data);
      setGoals(prev => [newGoal, ...prev]);
      return newGoal;
    } catch (error) {
      console.error('Error creating goal:', error);
      throw error;
    }
  };

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Remove optimistic update from here - let components handle their own optimistic UI

      // First, fetch the current goal to get existing data
      const { data: currentGoal, error: fetchError } = await supabase
        .from('goals')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Extract the database column updates
      const dbUpdates: any = {
        updated_at: new Date().toISOString(),
      };

      // Map top-level goal properties to their database columns
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.completedAt !== undefined) {
        dbUpdates.completed_at = updates.completedAt ? updates.completedAt.toISOString() : null;
      }
      if (updates.xpEarned !== undefined) dbUpdates.xp_earned = updates.xpEarned;

      // Merge category-specific data into the existing data JSONB column
      const existingData = currentGoal.data || {};
      const newData = extractGoalData(updates);
      const mergedData = { ...existingData, ...newData };
      
      if (Object.keys(newData).length > 0) {
        dbUpdates.data = mergedData;
      }

      const { data, error } = await supabase
        .from('goals')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Update with the actual data from Supabase to ensure consistency
      const updatedGoal = transformGoalFromDB(data);
      
      setGoals(prev => prev.map(goal => goal.id === id ? updatedGoal : goal));
      return updatedGoal;
    } catch (error) {
      console.error('Error updating goal:', error);
      // Revert the optimistic update on error by refetching
      fetchGoals();
      throw error;
    }
  };

  const deleteGoal = async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setGoals(prev => prev.filter(goal => goal.id !== id));
    } catch (error) {
      console.error('Error deleting goal:', error);
      throw error;
    }
  };

  const completeGoal = async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const xpEarned = 100; // Base XP for goal completion
      
      const { data, error } = await supabase
        .from('goals')
        .update({
          completed_at: new Date().toISOString(),
          xp_earned: xpEarned,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      const completedGoal = transformGoalFromDB(data);
      setGoals(prev => prev.map(goal => goal.id === id ? completedGoal : goal));
      
      // TODO: Update user XP and check for medals
      
      return xpEarned;
    } catch (error) {
      console.error('Error completing goal:', error);
      throw error;
    }
  };

  const getGoalsByCategory = (category: GoalCategory) => {
    return goals.filter(goal => goal.category === category && !goal.completedAt);
  };

  const getActiveCategories = (): GoalCategory[] => {
    const categories = new Set(
      goals
        .filter(goal => !goal.completedAt)
        .map(goal => goal.category)
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

// Helper functions to transform between app types and database types
function transformGoalFromDB(dbGoal: any): Goal {
  const baseGoal = {
    id: dbGoal.id,
    title: dbGoal.title,
    description: dbGoal.description,
    category: dbGoal.category,
    createdAt: new Date(dbGoal.created_at),
    completedAt: dbGoal.completed_at ? new Date(dbGoal.completed_at) : undefined,
    xpEarned: dbGoal.xp_earned,
  };

  // Merge category-specific data from the JSONB data column
  return { ...baseGoal, ...(dbGoal.data || {}) } as Goal;
}

function transformGoalToDB(goal: Partial<Goal>, userId: string) {
  const { id, createdAt, completedAt, xpEarned, ...rest } = goal;
  
  return {
    user_id: userId,
    title: goal.title!,
    description: goal.description || '',
    category: goal.category!,
    data: extractGoalData(goal),
    xp_earned: goal.xpEarned || 0,
  };
}

function extractGoalData(goal: Partial<Goal>) {
  const { id, title, description, category, createdAt, completedAt, xpEarned, ...data } = goal;
  return data;
}