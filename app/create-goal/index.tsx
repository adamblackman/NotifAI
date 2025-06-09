import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { GoalCategory, Goal } from '@/types/Goal';
import { useGoals } from '@/hooks/useGoals';
import { CategoryPicker } from '@/components/goals/CategoryPicker';
import { HabitForm } from '@/components/forms/HabitForm';
import { ProjectForm } from '@/components/forms/ProjectForm';
import { LearningForm } from '@/components/forms/LearningForm';
import { SavingForm } from '@/components/forms/SavingForm';

export default function CreateGoalScreen() {
  const [selectedCategory, setSelectedCategory] = useState<GoalCategory | null>(null);
  const { createGoal } = useGoals();

  const handleCategorySelect = (category: GoalCategory) => {
    setSelectedCategory(category);
  };

  const handleFormSubmit = async (goalData: Partial<Goal>) => {
    try {
      await createGoal(goalData);
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
      case 'learning':
        return <LearningForm onSubmit={handleFormSubmit} onCancel={handleCancel} />;
      case 'saving':
        return <SavingForm onSubmit={handleFormSubmit} onCancel={handleCancel} />;
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