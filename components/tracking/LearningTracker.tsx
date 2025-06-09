import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, TextInput } from 'react-native';
import { BookOpen, Award, CircleCheck as CheckCircle, Circle, TrendingUp, Plus, X } from 'lucide-react-native';
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
import { LearningGoal, CurriculumItem } from '@/types/Goal';

interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'habit' | 'project' | 'learning' | 'saving';
  data: Record<string, any>;
  xpEarned: number;
  createdAt: string;
  completedAt: string | null;
  updatedAt: string;
}

interface LearningTrackerProps {
  goals: Goal[];
}

const { width } = Dimensions.get('window');

export function LearningTracker({ goals }: LearningTrackerProps) {
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newItemTitles, setNewItemTitles] = useState<Record<string, string>>({});
  const { updateGoal } = useGoals();

  const getProgress = (goal: Goal) => {
    const learningGoal = goal as unknown as LearningGoal;
    const curriculumItems = learningGoal.curriculumItems || [];
    const completedItems = curriculumItems.filter((item: CurriculumItem) => item.completed).length;
    return {
      completed: completedItems,
      total: curriculumItems.length,
      percentage: curriculumItems.length > 0 ? (completedItems / curriculumItems.length) * 100 : 0,
    };
  };

  const addCurriculumItem = async (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    const newItemTitle = newItemTitles[goalId];
    
    if (!goal || !newItemTitle?.trim()) return;

    const learningGoal = goal as unknown as LearningGoal;
    const curriculumItems = learningGoal.curriculumItems || [];
    
    const newItem: CurriculumItem = {
      id: Date.now().toString(),
      title: newItemTitle.trim(),
      completed: false,
      order: curriculumItems.length,
    };

    const updatedItems = [...curriculumItems, newItem];

    try {
      await updateGoal(goalId, {
        ...goal,
        curriculumItems: updatedItems,
      });

      // Clear the input
      setNewItemTitles(prev => ({
        ...prev,
        [goalId]: '',
      }));
    } catch (error) {
      console.error('Error adding curriculum item:', error);
    }
  };

  const removeCurriculumItem = async (goalId: string, itemId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const learningGoal = goal as unknown as LearningGoal;
    const curriculumItems = learningGoal.curriculumItems || [];
    const updatedItems = curriculumItems.filter((item: CurriculumItem) => item.id !== itemId);

    // Reorder remaining items
    const reorderedItems = updatedItems.map((item: CurriculumItem, index: number) => ({
      ...item,
      order: index,
    }));

    try {
      await updateGoal(goalId, {
        ...goal,
        curriculumItems: reorderedItems,
      });
    } catch (error) {
      console.error('Error removing curriculum item:', error);
    }
  };

  const toggleCurriculumItem = async (goalId: string, itemId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const learningGoal = goal as unknown as LearningGoal;
    const curriculumItems = learningGoal.curriculumItems || [];
    const updatedItems = curriculumItems.map((item: CurriculumItem) => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );

    const wasCompleted = curriculumItems.find((item: CurriculumItem) => item.id === itemId)?.completed;
    const xpChange = wasCompleted ? -25 : 25;

    try {
      await updateGoal(goalId, {
        ...goal,
        curriculumItems: updatedItems,
        xpEarned: goal.xpEarned + xpChange,
      });

      // Check if this completion triggers a level up
      if (!wasCompleted && (goal.xpEarned + xpChange) % 100 === 0) {
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 3000);
      }
    } catch (error) {
      console.error('Error updating curriculum item:', error);
    }
  };

  const LessonCard = ({ goal, item, index }: { goal: Goal; item: CurriculumItem; index: number }) => {
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
        {index < (goal as unknown as LearningGoal).curriculumItems!.length - 1 && (
          <View style={styles.timelineConnector} />
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
                <BookOpen size={20} color={item.completed ? Colors.primary : Colors.gray400} />
                <Text style={[
                  styles.lessonTitle,
                  item.completed && styles.completedLessonTitle
                ]}>
                  {item.title}
                </Text>
              </View>
              <View style={styles.quizIcon}>
                <Award size={16} color={Colors.gray400} />
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

          {/* Remove button */}
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={() => removeCurriculumItem(goal.id, item.id)}
          >
            <X size={16} color={Colors.gray400} />
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
          const learningGoal = goal as unknown as LearningGoal;
          const progress = getProgress(goal);
          const curriculumItems = learningGoal.curriculumItems || [];

          return (
            <View key={goal.id} style={styles.learningCard}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.titleContainer}>
                  <BookOpen size={24} color={Colors.primary} />
                  <View style={styles.titleTextContainer}>
                    <Text style={styles.learningTitle}>{goal.title}</Text>
                    {goal.description && (
                      <Text style={styles.learningDescription}>{goal.description}</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Progress overview */}
              <View style={styles.progressOverview}>
                <Text style={styles.progressLabel}>Learning Progress</Text>
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

              {/* Learning timeline */}
              <View style={styles.timeline}>
                <Text style={styles.timelineTitle}>Learning Path</Text>
                
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
  learningCard: {
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
  learningTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: 4,
  },
  learningDescription: {
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
    paddingLeft: 40,
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
    left: 15,
    top: 32,
    width: 2,
    height: 40,
    backgroundColor: Colors.gray200,
  },
  timelineDot: {
    position: 'absolute',
    left: 7,
    top: 16,
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
});