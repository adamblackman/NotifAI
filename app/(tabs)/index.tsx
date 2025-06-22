import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useGoals } from '@/hooks/useGoals';
import { ThoughtDumpInput } from '@/components/goals/ThoughtDumpInput';
import { EmptyState } from '@/components/goals/EmptyState';
import { GoalTile } from '@/components/goals/GoalTile';
import { FloatingActionButton } from '@/components/goals/FloatingActionButton';
import { LoadingAnimation } from '@/components/ui/LoadingAnimation';
import { generateGoalFromThought } from '@/lib/goalGeneration';

export default function HomeScreen() {
  const { goals, refetch, isGoalCompleted, getGoalsSortedByCompletion } = useGoals();
  const [isGenerating, setIsGenerating] = useState(false);
  const [newlyGeneratedGoalIds, setNewlyGeneratedGoalIds] = useState<string[]>([]);
  
  // Get goals sorted by completion (incomplete first, completed at bottom)
  const sortedGoals = getGoalsSortedByCompletion();

  // Refresh goals when screen comes into focus (e.g., when navigating back from tracking screen)
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleThoughtDump = async (thought: string) => {
    setIsGenerating(true);
    setNewlyGeneratedGoalIds([]);
    
    try {
      const generatedGoals = await generateGoalFromThought(thought);
      
      // Store the IDs of newly generated goals for animation
      const newGoalIds = generatedGoals.map(goal => goal.id);
      setNewlyGeneratedGoalIds(newGoalIds);
      
      await refetch();
      
      const goalCount = generatedGoals.length;
      const message = goalCount === 1 
        ? 'Your goal has been created successfully!' 
        : `${goalCount} goals have been created successfully!`;
      
      Alert.alert(
        'Goals Created!', 
        message,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error generating goal:', error);
      Alert.alert(
        'Error', 
        'Failed to generate goals. Please try again or create one manually.',
        [
          { text: 'Try Again', style: 'cancel' },
          { text: 'Create Manually', onPress: () => router.push('/create-goal') }
        ]
      );
    } finally {
      setIsGenerating(false);
      // Clear the newly generated IDs after animation completes
      setTimeout(() => {
        setNewlyGeneratedGoalIds([]);
      }, 2000);
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
      <LoadingAnimation visible={isGenerating} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <ThoughtDumpInput onSubmit={handleThoughtDump} loading={isGenerating} />
        
        {sortedGoals.length === 0 ? (
          <EmptyState />
        ) : (
          <View style={styles.goalsContainer}>
            {sortedGoals.map((goal, index) => (
              <GoalTile
                key={goal.id}
                goal={goal}
                isCompleted={isGoalCompleted(goal)}
                onPress={() => handleGoalPress(goal.id)}
                isNewlyGenerated={newlyGeneratedGoalIds.includes(goal.id)}
                animationDelay={newlyGeneratedGoalIds.includes(goal.id) ? index * 150 : 0}
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
    paddingBottom: 120,
  },
});