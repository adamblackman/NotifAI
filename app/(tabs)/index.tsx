import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, Alert } from 'react-native';
import { router } from 'expo-router';
import DragList, { DragListRenderItemInfo } from 'react-native-draglist';
import { Colors } from '@/constants/Colors';
import { useGoals } from '@/hooks/useGoals';
import { ThoughtDumpInput } from '@/components/goals/ThoughtDumpInput';
import { EmptyState } from '@/components/goals/EmptyState';
import { GoalTile } from '@/components/goals/GoalTile';
import { FloatingActionButton } from '@/components/goals/FloatingActionButton';
import { generateGoalFromThought } from '@/lib/goalGeneration';

export default function HomeScreen() {
  const { goals, refetch, updateGoal } = useGoals();
  const [isGenerating, setIsGenerating] = useState(false);
  const activeGoals = goals.filter(goal => !goal.completedAt).sort((a, b) => (a.order || 0) - (b.order || 0));
  const completedGoals = goals.filter(goal => goal.completedAt);

  const handleThoughtDump = async (thought: string) => {
    setIsGenerating(true);
    try {
      console.log('Generating plan for:', thought);
      await generateGoalFromThought(thought);
      
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

  const onReordered = async (fromIndex: number, toIndex: number) => {
    // Only reorder active goals
    if (fromIndex === toIndex || fromIndex >= activeGoals.length || toIndex >= activeGoals.length) {
      return;
    }

    try {
      // Create a new array with the reordered goals
      const reorderedGoals = [...activeGoals];
      const [movedGoal] = reorderedGoals.splice(fromIndex, 1);
      reorderedGoals.splice(toIndex, 0, movedGoal);

      // Update the order field for each goal
      const updatePromises = reorderedGoals.map((goal, index) => 
        updateGoal(goal.id, { order: index })
      );

      await Promise.all(updatePromises);
      await refetch();
    } catch (error) {
      console.error('Error reordering goals:', error);
    }
  };

  const renderItem = ({ item, onDragStart, onDragEnd, isActive }: DragListRenderItemInfo<any>) => {
    return (
      <View
        onTouchStart={onDragStart}
        onTouchEnd={onDragEnd}
      >
        <GoalTile
          goal={item}
          onPress={() => handleGoalPress(item.id)}
          isDragging={isActive}
        />
      </View>
    );
  };

  const keyExtractor = (item: any) => item.id;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <ThoughtDumpInput onSubmit={handleThoughtDump} loading={isGenerating} />
        
        {activeGoals.length === 0 && completedGoals.length === 0 ? (
          <EmptyState />
        ) : (
          <View style={styles.goalsContainer}>
            {activeGoals.length > 0 && (
              <DragList
                data={activeGoals}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                onReordered={onReordered}
                scrollEnabled={false}
                style={styles.dragList}
              />
            )}
            
            {/* Show completed goals at the bottom */}
            {completedGoals.map((goal) => (
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
    paddingBottom: 120,
  },
  dragList: {
    marginBottom: 16,
  },
});