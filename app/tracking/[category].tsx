import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { useGoals } from '@/hooks/useGoals';
import { HabitTracker } from '@/components/tracking/HabitTracker';
import { ProjectTracker } from '@/components/tracking/ProjectTracker';
import { LearningTracker } from '@/components/tracking/LearningTracker';
import { SavingTracker } from '@/components/tracking/SavingTracker';

export default function TrackingScreen() {
  const { category, goalId } = useLocalSearchParams<{ category: string; goalId?: string }>();
  const { goals } = useGoals();
  
  const categoryGoals = goals.filter(goal => 
    goal.category === category && !goal.completedAt
  );

  const specificGoal = goalId ? goals.find(g => g.id === goalId) : null;
  const displayGoals = specificGoal ? [specificGoal] : categoryGoals;

  const getCategoryTitle = () => {
    switch (category) {
      case 'habit': return 'Habits';
      case 'project': return 'Projects';
      case 'learning': return 'Learning';
      case 'saving': return 'Saving';
      default: return 'Goals';
    }
  };

  const renderTracker = () => {
    if (displayGoals.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No active {category} goals</Text>
        </View>
      );
    }

    switch (category) {
      case 'habit':
        return <HabitTracker goals={displayGoals} />;
      case 'project':
        return <ProjectTracker goals={displayGoals} />;
      case 'learning':
        return <LearningTracker goals={displayGoals} />;
      case 'saving':
        return <SavingTracker goals={displayGoals} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={Colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.title}>{getCategoryTitle()}</Text>
      </View>
      
      <View style={styles.content}>
        {renderTracker()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.gray800,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.gray500,
    textAlign: 'center',
  },
});