import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { GoalCategory, Goal } from '@/types/Goal';
import { useGoals } from '@/hooks/useGoals';
import { useGuest } from '@/contexts/GuestContext';
import { CategoryPicker } from '@/components/goals/CategoryPicker';
import { HabitForm } from '@/components/forms/HabitForm';
import { ProjectForm } from '@/components/forms/ProjectForm';
import { LearnForm } from '@/components/forms/LearnForm';
import { SaveForm } from '@/components/forms/SaveForm';

export default function CreateGoalScreen() {
  const [selectedCategory, setSelectedCategory] = useState<GoalCategory | null>(null);
  const { createGoal } = useGoals();
  const { isGuestMode, addGuestGoal } = useGuest();

  const handleCategorySelect = (category: GoalCategory) => {
    setSelectedCategory(category);
  };

  const handleFormSubmit = async (goalData: Partial<Goal>) => {
    try {
      if (isGuestMode) {
        // Create goal locally for guest mode
        const guestGoal: Goal = {
          id: Date.now().toString(),
          title: goalData.title || '',
          description: goalData.description || '',
          category: goalData.category!,
          createdAt: new Date(),
          updatedAt: new Date(),
          xpEarned: 0,
          ...goalData,
        } as Goal;
        
        addGuestGoal(guestGoal);
      } else {
        // Regular authenticated flow
        await createGoal(goalData);
      }
      router.back();
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  const handleCancel = () => {
    if (selectedCategory) {
      setSelectedCategory(null);
    } else {
      router.back();
    }
  };

  const renderForm = () => {
    if (!selectedCategory) return null;

    switch (selectedCategory) {
      case 'habit':
        return <HabitForm onSubmit={handleFormSubmit} onCancel={handleCancel} />;
      case 'project':
        return <ProjectForm onSubmit={handleFormSubmit} onCancel={handleCancel} />;
      case 'learn':
        return <LearnForm onSubmit={handleFormSubmit} onCancel={handleCancel} />;
      case 'save':
        return <SaveForm onSubmit={handleFormSubmit} onCancel={handleCancel} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {!selectedCategory ? (
        <CategoryPicker onSelect={handleCategorySelect} />
      ) : (
        renderForm()
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
});