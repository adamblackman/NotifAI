import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, TextInput, Alert } from 'react-native';
import { BookOpen, Award, CircleCheck as CheckCircle, Circle, TrendingUp, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withSequence,
  runOnJS,
  withTiming,
  interpolate
} from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { useGoals } from '@/hooks/useGoals';
import { LearnGoal, CurriculumItem, Goal } from '@/types/Goal';

interface LearnTrackerProps {
  goals: LearnGoal[];
}

const { width } = Dimensions.get('window');

export function LearnTracker({ goals }: LearnTrackerProps) {
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newItemTitles, setNewItemTitles] = useState<Record<string, string>>({});
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, CurriculumItem[]>>({});
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());
  const { updateGoal } = useGoals();

  // Clear pending updates when the goals data is updated to match pending state AND no operations are pending
  useEffect(() => {
    Object.keys(pendingUpdates).forEach(goalId => {
      const goal = goals.find(g => g.id === goalId);
      const pendingItems = pendingUpdates[goalId];
      
      if (goal && pendingItems && pendingOperations.size === 0) { // Only clear if no operations are pending
        const learnGoal = goal as unknown as LearnGoal;
        const currentItems = learnGoal.curriculumItems || [];
        
        // Check if the current goal data matches our pending updates
        const itemsMatch = pendingItems.length === currentItems.length && 
          pendingItems.every(pendingItem => 
            currentItems.some(currentItem => 
              currentItem.id === pendingItem.id && 
              currentItem.title === pendingItem.title &&
              currentItem.completed === pendingItem.completed
            )
          );
        
        if (itemsMatch) {
          setPendingUpdates(prev => {
            const updated = { ...prev };
            delete updated[goalId];
            return updated;
          });
        }
      }
    });
  }, [goals, pendingUpdates, pendingOperations]);

  const getProgress = (goal: LearnGoal) => {
    // Use pending updates as base if they exist, otherwise use goal data
    const curriculumItems = pendingUpdates[goal.id] || goal.curriculumItems || [];
    const completedItems = curriculumItems.filter((item: CurriculumItem) => item.completed).length;
    return {
      completed: completedItems,
      total: curriculumItems.length,
      percentage: curriculumItems.length > 0 ? (completedItems / curriculumItems.length) * 100 : 0,
    };
  };

  const handleDeleteItem = (goalId: string, itemId: string, itemTitle: string) => {
    Alert.alert(
      'Delete Lesson',
      `Are you sure you want to delete "${itemTitle}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeCurriculumItem(goalId, itemId),
        },
      ],
    );
  };

  const addCurriculumItem = async (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    const newItemTitle = newItemTitles[goalId];
    
    if (!goal || !newItemTitle?.trim()) return;

    const learnGoal = goal as unknown as LearnGoal;
    // Use pending updates as base if they exist, otherwise use goal data
    const baseItems = pendingUpdates[goalId] || learnGoal.curriculumItems || [];
    
    // Find the first completed item to insert before it
    const firstCompletedIndex = baseItems.findIndex(item => item.completed);
    const insertIndex = firstCompletedIndex === -1 ? baseItems.length : firstCompletedIndex;
    
    const newItem: CurriculumItem = {
      id: Date.now().toString(),
      title: newItemTitle.trim(),
      completed: false,
      order: insertIndex,
    };

    // Insert the new item at the right position and reorder
    const updatedItems = [...baseItems];
    updatedItems.splice(insertIndex, 0, newItem);
    
    // Reorder all items to have sequential order values
    const reorderedItems = updatedItems.map((item, index) => ({
      ...item,
      order: index,
    }));
    
    // Create unique operation ID
    const operationId = `add-${goalId}-${Date.now()}`;
    

    // Track this operation and update local state for instant UI feedback
    setPendingOperations(prev => new Set([...prev, operationId]));
    setPendingUpdates(prev => ({
      ...prev,
      [goalId]: reorderedItems
    }));

    // Clear the input immediately for better UX
    setNewItemTitles(prev => ({
      ...prev,
      [goalId]: '',
    }));

    try {
      await updateGoal(goalId, {
        ...goal,
        curriculumItems: reorderedItems,
      });
      
      // Remove this operation from pending
      setPendingOperations(prev => {
        const updated = new Set(prev);
        updated.delete(operationId);
        return updated;
      });
    } catch (error) {
      console.error('Error adding curriculum item:', error);
      // Revert pending updates on error
      setPendingOperations(prev => {
        const updated = new Set(prev);
        updated.delete(operationId);
        return updated;
      });
      setPendingUpdates(prev => {
        const updated = { ...prev };
        delete updated[goalId];
        return updated;
      });
      // Restore the input text
      setNewItemTitles(prev => ({
        ...prev,
        [goalId]: newItemTitle,
      }));
    }
  };

  const removeCurriculumItem = async (goalId: string, itemId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const learnGoal = goal as unknown as LearnGoal;
    // Use pending updates as base if they exist, otherwise use goal data
    const baseItems = pendingUpdates[goalId] || learnGoal.curriculumItems || [];
    const updatedItems = baseItems.filter((item: CurriculumItem) => item.id !== itemId);

    // Reorder remaining items
    const reorderedItems = updatedItems.map((item: CurriculumItem, index: number) => ({
      ...item,
      order: index,
    }));

    // Create unique operation ID
    const operationId = `remove-${goalId}-${itemId}`;
    

    // Track this operation and update local state for instant UI feedback
    setPendingOperations(prev => new Set([...prev, operationId]));
    setPendingUpdates(prev => ({
      ...prev,
      [goalId]: reorderedItems
    }));

    try {
      await updateGoal(goalId, {
        ...goal,
        curriculumItems: reorderedItems,
      });
      
      // Remove this operation from pending
      setPendingOperations(prev => {
        const updated = new Set(prev);
        updated.delete(operationId);
        return updated;
      });
    } catch (error) {
      console.error('Error removing curriculum item:', error);
      // Revert pending updates on error
      setPendingOperations(prev => {
        const updated = new Set(prev);
        updated.delete(operationId);
        return updated;
      });
      setPendingUpdates(prev => {
        const updated = { ...prev };
        delete updated[goalId];
        return updated;
      });
    }
  };

  const toggleCurriculumItem = async (goalId: string, itemId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const learnGoal = goal as unknown as LearnGoal;
    // Use pending updates as base if they exist, otherwise use goal data
    const baseItems = pendingUpdates[goalId] || learnGoal.curriculumItems || [];
    const updatedItems = baseItems.map((item: CurriculumItem) => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );

    const wasCompleted = baseItems.find((item: CurriculumItem) => item.id === itemId)?.completed;
    const xpChange = wasCompleted ? -25 : 25;

    // Create unique operation ID
    const operationId = `toggle-${goalId}-${itemId}`;
    

    // Track this operation and update local state for instant UI feedback
    setPendingOperations(prev => new Set([...prev, operationId]));
    setPendingUpdates(prev => ({
      ...prev,
      [goalId]: updatedItems
    }));

    try {
      await updateGoal(goalId, {
        ...goal,
        curriculumItems: updatedItems,
        xpEarned: goal.xpEarned + xpChange,
      });

      // Remove this operation from pending
      setPendingOperations(prev => {
        const updated = new Set(prev);
        updated.delete(operationId);
        return updated;
      });

      // Check if this completion triggers a level up
      if (!wasCompleted && (goal.xpEarned + xpChange) % 100 === 0) {
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 3000);
      }
    } catch (error) {
      console.error('Error updating curriculum item:', error);
      // Revert pending updates on error
      setPendingOperations(prev => {
        const updated = new Set(prev);
        updated.delete(operationId);
        return updated;
      });
      setPendingUpdates(prev => {
        const updated = { ...prev };
        delete updated[goalId];
        return updated;
      });
    }
  };

  const moveItemUp = async (goalId: string, itemId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const learnGoal = goal as unknown as LearnGoal;
    // Use pending updates as base if they exist, otherwise use goal data
    const baseItems = pendingUpdates[goalId] || learnGoal.curriculumItems || [];
    
    // Only allow reordering within incomplete items
    const incompleteItems = baseItems.filter(item => !item.completed);
    const currentItemIndex = incompleteItems.findIndex(item => item.id === itemId);
    
    if (currentItemIndex <= 0) return; // Can't move up if already at top
    
    // Swap with the item above in incomplete items
    const newIncompleteItems = [...incompleteItems];
    [newIncompleteItems[currentItemIndex], newIncompleteItems[currentItemIndex - 1]] = 
    [newIncompleteItems[currentItemIndex - 1], newIncompleteItems[currentItemIndex]];
    
    // Combine with completed items (which stay at the end)
    const completedItems = baseItems.filter(item => item.completed);
    const updatedItems = [...newIncompleteItems, ...completedItems];
    
    // Reorder all items to have sequential order values
    const reorderedItems = updatedItems.map((item, index) => ({
      ...item,
      order: index,
    }));

    // Create unique operation ID
    const operationId = `move-up-${goalId}-${itemId}`;

    // Track this operation and update local state for instant UI feedback
    setPendingOperations(prev => new Set([...prev, operationId]));
    setPendingUpdates(prev => ({
      ...prev,
      [goalId]: reorderedItems
    }));

    try {
      await updateGoal(goalId, {
        ...goal,
        curriculumItems: reorderedItems,
      });

      // Remove this operation from pending
      setPendingOperations(prev => {
        const updated = new Set(prev);
        updated.delete(operationId);
        return updated;
      });
    } catch (error) {
      console.error('Error moving item up:', error);
      // Revert pending updates on error
      setPendingOperations(prev => {
        const updated = new Set(prev);
        updated.delete(operationId);
        return updated;
      });
      setPendingUpdates(prev => {
        const updated = { ...prev };
        delete updated[goalId];
        return updated;
      });
    }
  };

  const moveItemDown = async (goalId: string, itemId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const learnGoal = goal as unknown as LearnGoal;
    // Use pending updates as base if they exist, otherwise use goal data
    const baseItems = pendingUpdates[goalId] || learnGoal.curriculumItems || [];
    
    // Only allow reordering within incomplete items
    const incompleteItems = baseItems.filter(item => !item.completed);
    const currentItemIndex = incompleteItems.findIndex(item => item.id === itemId);
    
    if (currentItemIndex === -1 || currentItemIndex >= incompleteItems.length - 1) return; // Can't move down if already at bottom of incomplete items
    
    // Swap with the item below in incomplete items
    const newIncompleteItems = [...incompleteItems];
    [newIncompleteItems[currentItemIndex], newIncompleteItems[currentItemIndex + 1]] = 
    [newIncompleteItems[currentItemIndex + 1], newIncompleteItems[currentItemIndex]];
    
    // Combine with completed items (which stay at the end)
    const completedItems = baseItems.filter(item => item.completed);
    const updatedItems = [...newIncompleteItems, ...completedItems];
    
    // Reorder all items to have sequential order values
    const reorderedItems = updatedItems.map((item, index) => ({
      ...item,
      order: index,
    }));

    // Create unique operation ID
    const operationId = `move-down-${goalId}-${itemId}`;

    // Track this operation and update local state for instant UI feedback
    setPendingOperations(prev => new Set([...prev, operationId]));
    setPendingUpdates(prev => ({
      ...prev,
      [goalId]: reorderedItems
    }));

    try {
      await updateGoal(goalId, {
        ...goal,
        curriculumItems: reorderedItems,
      });

      // Remove this operation from pending
      setPendingOperations(prev => {
        const updated = new Set(prev);
        updated.delete(operationId);
        return updated;
      });
    } catch (error) {
      console.error('Error moving item down:', error);
      // Revert pending updates on error
      setPendingOperations(prev => {
        const updated = new Set(prev);
        updated.delete(operationId);
        return updated;
      });
      setPendingUpdates(prev => {
        const updated = { ...prev };
        delete updated[goalId];
        return updated;
      });
    }
  };

  const LessonCard = ({ goal, item, index }: { goal: LearnGoal; item: CurriculumItem; index: number }) => {
    const flipValue = useSharedValue(0);
    const scale = useSharedValue(1);
    const xpOpacity = useSharedValue(0);
    const xpTranslateY = useSharedValue(0);

    const frontAnimatedStyle = useAnimatedStyle(() => {
      const rotateY = interpolate(flipValue.value, [0, 1], [0, 180]);
      return {
        transform: [
          { perspective: 1000 },
          { rotateY: `${rotateY}deg` },
          { scale: scale.value }
        ],
        backfaceVisibility: 'hidden',
      };
    });

    const backAnimatedStyle = useAnimatedStyle(() => {
      const rotateY = interpolate(flipValue.value, [0, 1], [180, 360]);
      return {
        transform: [
          { perspective: 1000 },
          { rotateY: `${rotateY}deg` },
          { scale: scale.value }
        ],
        backfaceVisibility: 'hidden',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      };
    });

    const xpAnimatedStyle = useAnimatedStyle(() => ({
      opacity: xpOpacity.value,
      transform: [{ translateY: xpTranslateY.value }],
    }));

    const handlePress = () => {
      if (!item.completed) {
        // Flip animation
        flipValue.value = withTiming(1, { duration: 600 });
        
        // Scale animation
        scale.value = withSequence(
          withSpring(0.95, { duration: 100 }),
          withSpring(1, { duration: 100 })
        );

        // XP animation
        xpOpacity.value = withTiming(1, { duration: 200 });
        xpTranslateY.value = withTiming(-40, { duration: 1000 }, () => {
          xpOpacity.value = withTiming(0, { duration: 200 });
          xpTranslateY.value = 0;
        });
      }

      runOnJS(toggleCurriculumItem)(goal.id, item.id);
    };

    return (
      <View style={styles.lessonCardContainer}>
        {/* Timeline connector */}
        {(() => {
          const learnGoal = goal as unknown as LearnGoal;
          const currentItems = pendingUpdates[goal.id] || learnGoal.curriculumItems || [];
          return index < currentItems.length - 1;
        })() && (
          <View style={[
            styles.timelineConnector,
            item.completed && styles.completedTimelineConnector
          ]} />
        )}
        
        {/* Timeline dot */}
        <View style={[
          styles.timelineDot,
          item.completed && styles.completedTimelineDot
        ]}>
          {item.completed ? (
            <CheckCircle size={16} color={Colors.white} />
          ) : (
            <Circle size={16} color={Colors.gray400} />
          )}
        </View>

        <View style={styles.lessonCardContent}>
          <TouchableOpacity onPress={handlePress} style={styles.lessonCardTouchable}>
            {/* Front of card */}
            <Animated.View style={[styles.lessonCard, frontAnimatedStyle]}>
              <View style={styles.lessonHeader}>
                {/* Reorder arrows - only show on incomplete items */}
                {!item.completed && (() => {
                  const learnGoal = goal as unknown as LearnGoal;
                  const baseItems = pendingUpdates[goal.id] || learnGoal.curriculumItems || [];
                  const incompleteItems = baseItems.filter(i => !i.completed);
                  const currentItemIndex = incompleteItems.findIndex(i => i.id === item.id);
                  const canMoveUp = currentItemIndex > 0;
                  const canMoveDown = currentItemIndex < incompleteItems.length - 1;
                  
                  return (
                    <View style={styles.reorderButtonsInline}>
                      <TouchableOpacity 
                        style={[styles.reorderButton, !canMoveUp && styles.reorderButtonDisabled]}
                        onPress={() => canMoveUp && moveItemUp(goal.id, item.id)}
                        disabled={!canMoveUp}
                      >
                        <ChevronUp size={14} color={canMoveUp ? Colors.gray600 : Colors.gray300} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.reorderButton, !canMoveDown && styles.reorderButtonDisabled]}
                        onPress={() => canMoveDown && moveItemDown(goal.id, item.id)}
                        disabled={!canMoveDown}
                      >
                        <ChevronDown size={14} color={canMoveDown ? Colors.gray600 : Colors.gray300} />
                      </TouchableOpacity>
                    </View>
                  );
                })()}
                <Text style={[
                  styles.lessonTitle,
                  item.completed && styles.completedLessonTitle,
                  !item.completed && styles.lessonTitleWithArrows
                ]}>
                  {item.title}
                </Text>
              </View>
              <View style={styles.quizIcon}>
                <Award size={16} color={item.completed ? '#FFD700' : Colors.gray400} />
              </View>
            </Animated.View>

            {/* Back of card (completed state) */}
            {item.completed && (
              <Animated.View style={[styles.lessonCard, styles.completedCard, backAnimatedStyle]}>
                <View style={styles.completedContent}>
                  <CheckCircle size={32} color={Colors.white} />
                  <Text style={styles.completedText}>Completed!</Text>
                  <Text style={styles.xpEarnedText}>+25 XP</Text>
                </View>
              </Animated.View>
            )}
          </TouchableOpacity>

          {/* Delete button */}
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={() => handleDeleteItem(goal.id, item.id, item.title)}
          >
            <Trash2 size={16} color={Colors.gray400} />
          </TouchableOpacity>
        </View>

        {/* XP animation */}
        <Animated.View style={[styles.xpAnimation, xpAnimatedStyle]}>
          <Text style={styles.xpAnimationText}>+25 XP</Text>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Level Up Banner */}
      {showLevelUp && (
        <Animated.View style={styles.levelUpBanner}>
          <TrendingUp size={24} color={Colors.white} />
          <Text style={styles.levelUpText}>Level Up!</Text>
        </Animated.View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {goals.map((goal) => {
          const LearnGoal = goal as unknown as LearnGoal;
          const progress = getProgress(goal);
          // Use pending updates as base if they exist, otherwise use goal data
          const curriculumItems = pendingUpdates[goal.id] || LearnGoal.curriculumItems || [];

          return (
            <View key={goal.id} style={styles.LearnCard}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.titleContainer}>
                  <BookOpen size={24} color={Colors.primary} />
                  <View style={styles.titleTextContainer}>
                    <Text style={styles.LearnTitle}>{goal.title}</Text>
                    {goal.description && (
                      <Text style={styles.LearnDescription}>{goal.description}</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Progress overview */}
              <View style={styles.progressOverview}>
                <Text style={styles.progressLabel}>Progress</Text>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBar}>
                    <View style={[
                      styles.progressFill,
                      { width: `${progress.percentage}%` }
                    ]} />
                  </View>
                  <Text style={styles.progressPercentage}>
                    {Math.round(progress.percentage)}%
                  </Text>
                </View>
                <Text style={styles.progressText}>
                  {progress.completed} of {progress.total} lessons completed
                </Text>
              </View>

              {/* Learn timeline */}
              <View style={styles.timeline}>                
                {/* Add new item input */}
                <View style={styles.addItemContainer}>
                  <TextInput
                    style={styles.addItemInput}
                    placeholder="Add new lesson..."
                    value={newItemTitles[goal.id] || ''}
                    onChangeText={(text) => setNewItemTitles(prev => ({
                      ...prev,
                      [goal.id]: text,
                    }))}
                    onSubmitEditing={() => addCurriculumItem(goal.id)}
                  />
                  <TouchableOpacity 
                    style={styles.addButton} 
                    onPress={() => addCurriculumItem(goal.id)}
                  >
                    <Plus size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>

                {/* Curriculum items */}
                {curriculumItems.map((item: CurriculumItem, index: number) => (
                  <LessonCard
                    key={item.id}
                    goal={goal}
                    item={item}
                    index={index}
                  />
                ))}

                {curriculumItems.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      No lessons added yet. Add your first lesson above!
                    </Text>
                  </View>
                )}
              </View>

              {/* Stats */}
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{goal.xpEarned}</Text>
                  <Text style={styles.statLabel}>XP Earned</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{progress.completed}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{progress.total - progress.completed}</Text>
                  <Text style={styles.statLabel}>Remaining</Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  levelUpBanner: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  levelUpText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  LearnCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  titleTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  LearnTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: 4,
  },
  LearnDescription: {
    fontSize: 14,
    color: Colors.gray600,
    lineHeight: 20,
  },
  progressOverview: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: Colors.gray50,
    borderRadius: 12,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray700,
    marginBottom: 8,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.gray200,
    borderRadius: 4,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    minWidth: 40,
  },
  progressText: {
    fontSize: 12,
    color: Colors.gray500,
  },
  timeline: {
    marginBottom: 20,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray800,
    marginBottom: 16,
  },
  addItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingLeft: 0,
  },
  addItemInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: Colors.white,
    marginRight: 12,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  lessonCardContainer: {
    position: 'relative',
    marginBottom: 16,
    paddingLeft: 40,
  },
  timelineConnector: {
    position: 'absolute',
    left: 18, // Centered with the 24px wide circle (7 + 12 - 1 = 18)
    top: 44, // Start from bottom of the centered circle (28 + 24 - 8 = 44)
    width: 2,
    height: 80, // Doubled from 40px to 80px
    backgroundColor: Colors.gray200,
  },
  completedTimelineConnector: {
    backgroundColor: '#8B5CF6', // Purple color
  },
  timelineDot: {
    position: 'absolute',
    left: 7,
    top: 28, // Centered with 80px tall lesson card (40px - 12px = 28px)
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedTimelineDot: {
    backgroundColor: Colors.primary,
  },
  lessonCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lessonCardTouchable: {
    flex: 1,
    height: 80,
  },
  lessonCard: {
    height: 80,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gray200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completedCard: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray800,
    marginLeft: 12,
    flex: 1,
  },
  completedLessonTitle: {
    color: Colors.gray500,
    textDecorationLine: 'line-through',
  },
  quizIcon: {
    padding: 8,
  },
  completedContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  completedText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  xpEarnedText: {
    color: Colors.white,
    fontSize: 12,
    marginTop: 4,
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
  xpAnimation: {
    position: 'absolute',
    left: 60,
    top: 20,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  xpAnimationText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.gray500,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.gray500,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reorderButtons: {
    flexDirection: 'column',
    marginRight: 8,
  },
  reorderButton: {
    padding: 4,
  },
  reorderButtonDisabled: {
    opacity: 0.3,
  },
  reorderButtonsInline: {
    flexDirection: 'column',
    marginRight: 12,
  },
  lessonTitleWithArrows: {
    marginLeft: 0,
  },
});