import React from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useGoals } from '@/hooks/useGoals';
import { ThoughtDumpInput } from '@/components/goals/ThoughtDumpInput';
import { EmptyState } from '@/components/goals/EmptyState';
import { GoalTile } from '@/components/goals/GoalTile';
import { FloatingActionButton } from '@/components/goals/FloatingActionButton';

export default function HomeScreen() {
  const { goals } = useGoals();
  const activeGoals = goals.filter(goal => !goal.completedAt);

  const handleThoughtDump = async (thought: string) => {
    // TODO: Send to OpenAI for goal plan generation
    console.log('Generating plan for:', thought);
    // For now, just navigate to manual creation
    router.push('/create-goal');
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
        <ThoughtDumpInput onSubmit={handleThoughtDump} />
        
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