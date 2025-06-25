import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Goal } from '@/types/Goal';

interface GuestContextType {
  isGuestMode: boolean;
  guestGoals: Goal[];
  hasUsedAI: boolean;
  setGuestMode: (enabled: boolean) => void;
  addGuestGoal: (goal: Goal) => void;
  updateGuestGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGuestGoal: (id: string) => void;
  markAIUsed: () => void;
  clearGuestData: () => void;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

interface GuestProviderProps {
  children: ReactNode;
}

export function GuestProvider({ children }: GuestProviderProps) {
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [guestGoals, setGuestGoals] = useState<Goal[]>([]);
  const [hasUsedAI, setHasUsedAI] = useState(false);

  const setGuestMode = (enabled: boolean) => {
    setIsGuestMode(enabled);
    if (!enabled) {
      clearGuestData();
    }
  };

  const addGuestGoal = (goal: Goal) => {
    setGuestGoals(prev => [goal, ...prev]);
  };

  const updateGuestGoal = (id: string, updates: Partial<Goal>) => {
    setGuestGoals(prev => 
      prev.map(goal => 
        goal.id === id ? { ...goal, ...updates } : goal
      )
    );
  };

  const deleteGuestGoal = (id: string) => {
    setGuestGoals(prev => prev.filter(goal => goal.id !== id));
  };

  const markAIUsed = () => {
    setHasUsedAI(true);
  };

  const clearGuestData = () => {
    setGuestGoals([]);
    setHasUsedAI(false);
  };

  const value: GuestContextType = {
    isGuestMode,
    guestGoals,
    hasUsedAI,
    setGuestMode,
    addGuestGoal,
    updateGuestGoal,
    deleteGuestGoal,
    markAIUsed,
    clearGuestData,
  };

  return (
    <GuestContext.Provider value={value}>
      {children}
    </GuestContext.Provider>
  );
}

export function useGuest() {
  const context = useContext(GuestContext);
  if (context === undefined) {
    throw new Error('useGuest must be used within a GuestProvider');
  }
  return context;
}