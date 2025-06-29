import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Stack } from 'expo-router';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { useGoals } from '@/hooks/useGoals';
import { HabitGoal, ProjectGoal, LearnGoal, SaveGoal } from '@/types/Goal';
import { HabitTracker } from '@/components/tracking/HabitTracker';
import { ProjectTracker } from '@/components/tracking/ProjectTracker';
import { LearnTracker } from '@/components/tracking/LearnTracker';
import { SaveTracker } from '@/components/tracking/SaveTracker';

export default function TrackingScreen() {
  const { category, goalId } = useLocalSearchParams<{ category: string; goalId?: string }>();
  const { goals, deleteGoal } = useGoals();
  
  const categoryGoals = goals.filter(goal => 
    goal.category === category && !goal.completedAt
  );

  const specificGoal = goalId ? goals.find(g => g.id === goalId) : null;
  const displayGoals = specificGoal ? [specificGoal] : categoryGoals;

  const getCategoryTitle = () => {
    switch (category) {
      case 'habit': return 'Habits';
      case 'project': return 'Projects';
      case 'learn': return 'Learn';
      case 'save': return 'Save';
      default: return 'Goals';
    }
  };

  const handleDeleteGoal = () => {
    if (displayGoals.length === 0) return;
    
    const goalToDelete = displayGoals[0];
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${goalToDelete.title}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGoal(goalToDelete.id);
              router.back();
            } catch (error) {
              console.error('Error deleting goal:', error);
              Alert.alert('Error', 'Failed to delete goal. Please try again.');
            }
          },
        },
      ]
    );
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
        return <HabitTracker goals={displayGoals as HabitGoal[]} />;
      case 'project':
        return <ProjectTracker goals={displayGoals as ProjectGoal[]} />;
      case 'learn':
        return <LearnTracker goals={displayGoals as LearnGoal[]} />;
      case 'save':
        return <SaveTracker goals={displayGoals as SaveGoal[]} />;
      default:
        return null;
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.leftSection}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={24} color={Colors.gray700} />
            </TouchableOpacity>
            <Text style={styles.title}>{getCategoryTitle()}</Text>
          </View>
          {displayGoals.length > 0 && (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={handleDeleteGoal}
            >
              <Trash2 size={24} color={Colors.gray400} />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.content}>
          {renderTracker()}
        </View>
      </SafeAreaView>
    </>
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
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
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
  deleteButton: {
    padding: 8,
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