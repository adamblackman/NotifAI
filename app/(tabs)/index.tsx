import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useGoals } from '@/hooks/useGoals';
import { useGuest } from '@/contexts/GuestContext';
import { ThoughtDumpInput } from '@/components/goals/ThoughtDumpInput';
import { EmptyState } from '@/components/goals/EmptyState';
import { GoalTile } from '@/components/goals/GoalTile';
import { FloatingActionButton } from '@/components/goals/FloatingActionButton';
import { LoadingAnimation } from '@/components/ui/LoadingAnimation';
import { GuestModeModal } from '@/components/ui/GuestModeModal';
import { generateGoalFromThought } from '@/lib/goalGeneration';
import { Header } from '@/components/ui/Header';

export default function HomeScreen() {
  const { goals, refetch, isGoalCompleted, getGoalsSortedByCompletion } = useGoals();
  const { 
    isGuestMode, 
    guestGoals, 
    hasUsedAI, 
    addGuestGoal, 
    markAIUsed, 
    setGuestMode 
  } = useGuest();
  const [isGenerating, setIsGenerating] = useState(false);
  const [newlyGeneratedGoalIds, setNewlyGeneratedGoalIds] = useState<string[]>([]);
  const [showGuestModal, setShowGuestModal] = useState(false);
  
  // Use guest goals if in guest mode, otherwise use regular goals
  const displayGoals = isGuestMode ? guestGoals : goals;
  const sortedGoals = isGuestMode 
    ? guestGoals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    : getGoalsSortedByCompletion();

  // Refresh goals when screen comes into focus (only for authenticated users)
  useFocusEffect(
    useCallback(() => {
      if (!isGuestMode) {
        refetch();
      }
    }, [refetch, isGuestMode])
  );

  const handleThoughtDump = async (thought: string) => {
    if (isGuestMode && hasUsedAI) {
      setShowGuestModal(true);
      return;
    }

    setIsGenerating(true);
    setNewlyGeneratedGoalIds([]);
    
    try {
      if (isGuestMode) {
        // For guest mode, use AI but store locally
        const generatedGoals = await generateGoalFromThought(thought, true);
        generatedGoals.forEach(goal => addGuestGoal(goal));
        markAIUsed();
        
        const goalCount = generatedGoals.length;
        const message = goalCount === 1 
          ? 'Your goal has been created successfully!' 
          : `${goalCount} goals have been created successfully!`;
        
        Alert.alert('Goals Created!', message, [{ text: 'OK' }]);
      } else {
        // Regular authenticated flow
        const generatedGoals = await generateGoalFromThought(thought, false);
        
        const newGoalIds = generatedGoals.map(goal => goal.id);
        setNewlyGeneratedGoalIds(newGoalIds);
        
        await refetch();
        
        const goalCount = generatedGoals.length;
        const message = goalCount === 1 
          ? 'Your goal has been created successfully!' 
          : `${goalCount} goals have been created successfully!`;
        
        Alert.alert('Goals Created!', message, [{ text: 'OK' }]);
      }
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
      setTimeout(() => {
        setNewlyGeneratedGoalIds([]);
      }, 2000);
    }
  };



  const handleGoalPress = (goalId: string) => {
    if (isGuestMode) {
      // Allow tracking in guest mode
      const goal = guestGoals.find(g => g.id === goalId);
      if (goal) {
        router.push(`/tracking/${goal.category}?goalId=${goalId}`);
      }
      return;
    }

    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      router.push(`/tracking/${goal.category}?goalId=${goalId}`);
    }
  };

  const handleManualCreate = () => {
    // Allow manual goal creation in guest mode
    router.push('/create-goal');
  };

  const handleCreateAccount = () => {
    setShowGuestModal(false);
    setGuestMode(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header />
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
                  isCompleted={isGuestMode ? false : isGoalCompleted(goal)}
                  onPress={() => handleGoalPress(goal.id)}
                  isNewlyGenerated={newlyGeneratedGoalIds.includes(goal.id)}
                  animationDelay={newlyGeneratedGoalIds.includes(goal.id) ? index * 150 : 0}
                />
              ))}
            </View>
          )}
        </ScrollView>
        
        <FloatingActionButton onPress={handleManualCreate} isGuestMode={isGuestMode} />

        <GuestModeModal
          visible={showGuestModal}
          onClose={() => setShowGuestModal(false)}
          onCreateAccount={handleCreateAccount}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
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