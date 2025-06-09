import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useGoals } from '@/hooks/useGoals';
import { ThoughtDumpInput } from '@/components/goals/ThoughtDumpInput';
import { EmptyState } from '@/components/goals/EmptyState';
import { GoalTile } from '@/components/goals/GoalTile';
import { FloatingActionButton } from '@/components/goals/FloatingActionButton';
import { generateGoalFromThought } from '@/lib/goalGeneration';

export default function HomeScreen() {
  const { goals, refetch } = useGoals();
  const [isGenerating, setIsGenerating] = useState(false);
  const activeGoals = goals.filter(goal => !goal.completedAt);

  const handleThoughtDump = async (thought: string) => {
    setIsGenerating(true);
    try {
      console.log('Generating plan for:', thought);
      await generateGoalFromThought(thought);
      
      // Refresh the goals list to show the new goal
      await refetch();
      
      Alert.alert(
        'Goal Created!', 
        'Your goal has been created successfully!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error generating goal:', error);
      Alert.alert(
        'Error', 
        'Failed to generate goal. Please try again or create one manually.',
        [
          { text: 'Try Again', style: 'cancel' },
          { text: 'Create Manually', onPress: () => router.push('/create-goal') }
        ]
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGoalPress = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      router.push(`/tracking/${goal.category}?goalId=${goalId}`);
    }
  };

  const handleManualCreate = () => {
    router.push('/create-goal');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <ThoughtDumpInput onSubmit={handleThoughtDump} loading={isGenerating} />
        
        {activeGoals.length === 0 ? (
          <EmptyState />
        ) : (
          <View style={styles.goalsContainer}>
            {activeGoals.map((goal) => (
              <GoalTile
                key={goal.id}
                goal={goal}
                onPress={() => handleGoalPress(goal.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
      
      <FloatingActionButton onPress={handleManualCreate} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  scrollView: {
    flex: 1,
  },
  goalsContainer: {
    padding: 16,
    paddingBottom: 120, // Space for FAB and tab bar
  },
});