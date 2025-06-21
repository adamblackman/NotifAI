import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, TextInput } from 'react-native';
import { Repeat, Flame, Calendar, ChevronDown, Edit3, Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withSequence,
  runOnJS,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { useGoals } from '@/hooks/useGoals';
import { useProfile } from '@/hooks/useProfile';
import { HabitGoal, Goal } from '@/types/Goal';

interface HabitTrackerProps {
  goals: HabitGoal[];
}

const { width } = Dimensions.get('window');
const dayWidth = (width - 64) / 7;

export function HabitTracker({ goals }: HabitTrackerProps) {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, string[]>>({});
  const [pendingXPUpdates, setPendingXPUpdates] = useState<Record<string, number>>({});
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [editedTitles, setEditedTitles] = useState<Record<string, string>>({});
  const [editedDescriptions, setEditedDescriptions] = useState<Record<string, string>>({});
  const [editedTargetDays, setEditedTargetDays] = useState<Record<string, string>>({});
  const { updateGoal, deleteGoal, checkAndCompleteGoal, isGoalCompleted, getGoalsSortedByCompletion } = useGoals();
  const { syncProfileXPToGoals, awardMedalForGoalCompletion } = useProfile();

  const toggleEditMode = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const isCurrentlyEditing = editMode[goalId];
    
    if (isCurrentlyEditing) {
      // Save changes
      saveGoalEdits(goalId);
    } else {
      // Enter edit mode - populate current values
      const habitGoal = goal as unknown as HabitGoal;
      setEditedTitles(prev => ({
        ...prev,
        [goalId]: goal.title
      }));
      setEditedDescriptions(prev => ({
        ...prev,
        [goalId]: goal.description || ''
      }));
      setEditedTargetDays(prev => ({
        ...prev,
        [goalId]: habitGoal.targetDays?.toString() || ''
      }));
    }
    
    setEditMode(prev => ({
      ...prev,
      [goalId]: !isCurrentlyEditing
    }));
  };

  const saveGoalEdits = async (goalId: string) => {
    const newTitle = editedTitles[goalId];
    const newDescription = editedDescriptions[goalId];
    const newTargetDays = editedTargetDays[goalId];
    
    if (!newTitle?.trim()) return;

    try {
      const updateData: any = {
        title: newTitle.trim(),
        description: newDescription?.trim() || undefined
      };

      if (newTargetDays?.trim()) {
        const targetDaysNum = parseInt(newTargetDays.trim());
        if (!isNaN(targetDaysNum) && targetDaysNum > 0) {
          updateData.targetDays = targetDaysNum;
        }
      }

      await updateGoal(goalId, updateData);
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  useEffect(() => {
    Object.keys(pendingUpdates).forEach(goalId => {
      const goal = goals.find(g => g.id === goalId);
      const pendingDates = pendingUpdates[goalId];
      
      if (goal && pendingOperations.size === 0) {
        const habitGoal = goal as unknown as HabitGoal;
        const currentDates = habitGoal.completedDates || [];
        
        const arraysMatch = pendingDates.length === currentDates.length && 
          pendingDates.every(date => currentDates.includes(date)) &&
          currentDates.every(date => pendingDates.includes(date));
        
        if (arraysMatch) {
          setPendingUpdates(prev => {
            const updated = { ...prev };
            delete updated[goalId];
            return updated;
          });
        }
      }
    });
  }, [goals, pendingUpdates, pendingOperations]);

  const getMonthDates = (monthOffset: number = 0) => {
    const today = new Date();
    const targetMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    
    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(firstDay.getDate() + mondayOffset);
    
    const dates = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    
    return { dates, month: targetMonth };
  };

  const displayMonthOffset = selectedMonth !== null ? selectedMonth : 0;
  const { dates: monthDates, month: displayMonth } = getMonthDates(displayMonthOffset);
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const isHabitCompletedOnDate = (goal: Goal, date: Date) => {
    const habitGoal = goal as unknown as HabitGoal;
    const completedDates = habitGoal.completedDates || [];
    const dateStr = date.toISOString().split('T')[0];
    
    const pending = pendingUpdates[goal.id];
    if (pending) {
      return pending.includes(dateStr);
    }
    
    return completedDates.includes(dateStr);
  };

  const getCurrentStreakCount = (goal: Goal) => {
    const habitGoal = goal as unknown as HabitGoal;
    let completedDates = habitGoal.completedDates || [];
    
    const pending = pendingUpdates[goal.id];
    if (pending) {
      completedDates = pending;
    }
    
    if (completedDates.length === 0) return 0;

    // Check if today is selected - if not, streak is 0
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    if (!completedDates.includes(todayStr)) {
      return 0;
    }

    // Today is selected, count backwards for consecutive days
    let streak = 1; // Start with 1 for today
    let checkDate = new Date(today);
    
    while (true) {
      checkDate.setDate(checkDate.getDate() - 1); // Go back one day
      const checkDateStr = checkDate.toISOString().split('T')[0];
      
      if (completedDates.includes(checkDateStr)) {
        streak++;
      } else {
        break; // End of consecutive streak
      }
    }
    
    return streak;
  };

  const getLongestStreakCount = (goal: Goal) => {
    const habitGoal = goal as unknown as HabitGoal;
    let completedDates = habitGoal.completedDates || [];
    
    const pending = pendingUpdates[goal.id];
    if (pending) {
      completedDates = pending;
    }
    
    if (completedDates.length === 0) return 0;

    const sortedDates = completedDates.sort((a: string, b: string) => a.localeCompare(b));
    let maxStreak = 0;
    let currentStreak = 1;
    
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const diffTime = currDate.getTime() - prevDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentStreak++;
      } else {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 1;
      }
    }
    
    return Math.max(maxStreak, currentStreak);
  };

  const calculateStreakXP = (streak: number) => {
    // User's specified XP system:
    // +1 for each day selected
    // +2 for NEW day when 2 day streak  
    // up to max +5 for five day streak and beyond
    if (streak <= 1) return 1;
    if (streak === 2) return 2;
    if (streak === 3) return 3;
    if (streak === 4) return 4;
    return 5; // Max 5 XP for 5+ day streaks
  };

  const calculatePreviousStreakXP = (completedDates: string[], removedDate: string) => {
    // Calculate what the XP was for the day being removed
    // by simulating the streak without that date
    const sortedDates = completedDates
      .filter(date => date !== removedDate)
      .sort();
    
    const removedIndex = completedDates.indexOf(removedDate);
    if (removedIndex === -1) return 1; // Default if not found
    
    // Find the streak length at the time this date was added
    let streakAtTime = 1;
    const removedDateObj = new Date(removedDate);
    
    // Count consecutive days leading up to (and including) the removed date
    const allSortedDates = [...completedDates].sort();
    const currentIndex = allSortedDates.indexOf(removedDate);
    
    if (currentIndex > 0) {
      for (let i = currentIndex - 1; i >= 0; i--) {
        const prevDate = new Date(allSortedDates[i]);
        const currDate = new Date(allSortedDates[i + 1]);
        const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          streakAtTime++;
        } else {
          break;
        }
      }
    }
    
    return calculateStreakXP(streakAtTime);
  };

  const toggleHabitDate = async (goalId: string, date: Date) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const habitGoal = goal as unknown as HabitGoal;
    const baseDates = pendingUpdates[goalId] || habitGoal.completedDates || [];
    const dateStr = date.toISOString().split('T')[0];
    const isCompleted = baseDates.includes(dateStr);
    
    const operationId = `${goalId}-${dateStr}-${Date.now()}`;
        
    let newCompletedDates;
    
    if (isCompleted) {
      newCompletedDates = baseDates.filter((d: string) => d !== dateStr);
    } else {
      newCompletedDates = [...baseDates, dateStr];
    }
    
    // Calculate total XP as 1 × number of completed days
    const newXpEarned = newCompletedDates.length * 1;
    const xpChange = newXpEarned - goal.xpEarned;
    
    // Update UI immediately for responsiveness
    setPendingUpdates(prev => ({
      ...prev,
      [goalId]: newCompletedDates
    }));

    // Track XP changes optimistically for immediate UI update
    const currentPendingXP = pendingXPUpdates[goalId] || 0;
    setPendingXPUpdates(prev => ({
      ...prev,
      [goalId]: currentPendingXP + xpChange
    }));

    // Track pending operation
    setPendingOperations(prev => new Set([...prev, operationId]));

    // Do async operations in background without blocking UI
    try {
      const updatedGoal = await updateGoal(goalId, {
        completedDates: newCompletedDates,
        xpEarned: newXpEarned,
      });
      
      // Check if goal should be completed and award medals
      const wasCompleted = await checkAndCompleteGoal(updatedGoal);
      if (wasCompleted) {
        await awardMedalForGoalCompletion('habit');
      }
      
      // Sync profile XP to match the sum of all goal XP
      await syncProfileXPToGoals();
      
      setPendingOperations(prev => {
        const updated = new Set(prev);
        updated.delete(operationId);
        return updated;
      });

      // Clear pending XP updates when operation completes
      if (pendingXPUpdates[goalId] !== undefined) {
        setPendingXPUpdates(prev => {
          const updated = { ...prev };
          delete updated[goalId];
          return updated;
        });
      }
    } catch (error) {
      console.error('Error updating habit:', error);
      // Revert changes on error
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
      setPendingXPUpdates(prev => ({
        ...prev,
        [goalId]: currentPendingXP
      }));
    }
  };

  const getFlameIntensity = (streak: number) => {
    if (streak === 0) return { color: Colors.gray400, size: 20 };
    if (streak < 3) return { color: '#FF6B35', size: 22 };
    if (streak < 7) return { color: '#FF4500', size: 24 };
    if (streak < 14) return { color: '#FF2500', size: 26 };
    return { color: '#FF0000', size: 28 };
  };

  const isCurrentMonth = (date: Date) => {
    const today = new Date();
    return date.getMonth() === displayMonth.getMonth() && date.getFullYear() === displayMonth.getFullYear();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isBeforeCreation = (goal: Goal, date: Date) => {
    const creationDate = new Date(goal.createdAt);
    creationDate.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < creationDate;
  };

  const isFutureDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate > today;
  };

  const DayTile = ({ goal, date }: { goal: Goal; date: Date }) => {
    const isCompleted = isHabitCompletedOnDate(goal, date);
    const scale = useSharedValue(1);
    const isTodayDate = isToday(date);
    const isCurrentMonthDate = isCurrentMonth(date);
    const isFuture = isFutureDate(date);
    const isBeforeGoalCreation = isBeforeCreation(goal, date);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const handlePress = () => {
      if (!isCurrentMonthDate || isFuture || isBeforeGoalCreation) return;
      
      const habitGoal = goal as unknown as HabitGoal;
      const currentDates = pendingUpdates[goal.id] || habitGoal.completedDates || [];
      const dateStr = date.toISOString().split('T')[0];

      scale.value = withSequence(
        withSpring(0.9, { duration: 100 }),
        withSpring(1, { duration: 100 })
      );

      runOnJS(toggleHabitDate)(goal.id, date);
    };

    return (
      <View style={styles.dayContainer}>
        <TouchableOpacity 
          onPress={handlePress} 
          disabled={!isCurrentMonthDate || isFuture || isBeforeGoalCreation}
          style={[
            styles.dayTouchable,
            (!isCurrentMonthDate || isFuture || isBeforeGoalCreation) && styles.disabledTouchable
          ]}
        >
          <Animated.View style={[
            styles.dayTile,
            isCompleted && styles.completedTile,
            isTodayDate && styles.todayTile,
            !isCurrentMonthDate && styles.otherMonthTile,
            isFuture && styles.futureTile,
            isBeforeGoalCreation && styles.beforeCreationTile,
            animatedStyle
          ]}>
            <Text style={[
              styles.dayNumber,
              isCompleted && styles.completedDayNumber,
              isTodayDate && styles.todayDayNumber,
              !isCurrentMonthDate && styles.otherMonthDayNumber,
              isFuture && styles.futureDayNumber,
              isBeforeGoalCreation && styles.beforeCreationDayNumber,
              isTodayDate && isCompleted && styles.todayCompletedDayNumber
            ]}>
              {date.getDate()}
            </Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const canNavigateLeft = (goal: Goal) => {
    const goalCreatedAt = new Date(goal.createdAt);
    const currentDisplayMonth = getMonthDates(displayMonthOffset).month;
    
    const goalCreationMonth = new Date(goalCreatedAt.getFullYear(), goalCreatedAt.getMonth(), 1);
    const displayMonth = new Date(currentDisplayMonth.getFullYear(), currentDisplayMonth.getMonth(), 1);
    
    return displayMonth > goalCreationMonth;
  };

  const canNavigateRight = () => {
    const today = new Date();
    const currentDisplayMonth = getMonthDates(displayMonthOffset).month;
    
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const displayMonth = new Date(currentDisplayMonth.getFullYear(), currentDisplayMonth.getMonth(), 1);
    
    return displayMonth < currentMonth;
  };

  const navigateMonth = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      setSelectedMonth(prev => (prev || 0) - 1);
    } else {
      setSelectedMonth(prev => (prev || 0) + 1);
    }
  };

  // Use the goals passed as props (already filtered by the parent component)
  const sortedGoals = goals;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {sortedGoals.map((goal) => {
          const currentStreak = getCurrentStreakCount(goal);
          const longestStreak = getLongestStreakCount(goal);
          const flameProps = getFlameIntensity(currentStreak);
          const completed = isGoalCompleted(goal);

          return (
            <View key={goal.id} style={[styles.habitCard, completed && styles.completedCard]}>
              <View style={styles.cardHeader}>
                <View style={styles.titleContainer}>
                  <View style={styles.titleTextContainer}>
                    {editMode[goal.id] ? (
                      <>
                        <TextInput
                          style={[styles.titleInput, completed && styles.completedTitle]}
                          value={editedTitles[goal.id] || ''}
                          onChangeText={(text) => setEditedTitles(prev => ({
                            ...prev,
                            [goal.id]: text
                          }))}
                          placeholder="Habit title"
                          multiline
                        />
                        <TextInput
                          style={[styles.descriptionInput, completed && styles.completedDescription]}
                          value={editedDescriptions[goal.id] || ''}
                          onChangeText={(text) => setEditedDescriptions(prev => ({
                            ...prev,
                            [goal.id]: text
                          }))}
                          placeholder="Habit description (optional)"
                          multiline
                        />
                      </>
                    ) : (
                      <>
                        <Text style={[styles.habitTitle, completed && styles.completedTitle]}>
                          {editedTitles[goal.id] || goal.title}
                        </Text>
                        {(editedDescriptions[goal.id] || goal.description) && (
                          <Text style={[styles.habitDescription, completed && styles.completedDescription]}>
                            {editedDescriptions[goal.id] || goal.description}
                          </Text>
                        )}
                      </>
                    )}
                  </View>
                </View>
                <View style={styles.streakContainer}>
                  <Flame size={flameProps.size} color={flameProps.color} />
                  <Text style={styles.streakNumber}>{currentStreak}</Text>
                  <Text style={styles.streakLabel}>day streak</Text>
                </View>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => toggleEditMode(goal.id)}
                >
                  {editMode[goal.id] ? (
                    <Check size={18} color={Colors.primary} />
                  ) : (
                    <Edit3 size={18} color={Colors.gray600} />
                  )}
                </TouchableOpacity>
              </View>

              {((goal as unknown as HabitGoal).targetDays || editMode[goal.id]) && (
                <View style={styles.progressSection}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressTitle}>Progress</Text>
                    {editMode[goal.id] ? (
                      <View style={styles.targetDaysEdit}>
                        <TextInput
                          style={styles.targetDaysInput}
                          value={editedTargetDays[goal.id] || ''}
                          onChangeText={(text) => setEditedTargetDays(prev => ({
                            ...prev,
                            [goal.id]: text
                          }))}
                          placeholder="Target days"
                          keyboardType="numeric"
                        />
                        <Text style={styles.targetDaysLabel}>days</Text>
                      </View>
                    ) : (
                      <Text style={styles.progressText}>
                        {(() => {
                          const habitGoal = goal as unknown as HabitGoal;
                          const pending = pendingUpdates[goal.id];
                          const completedCount = pending ? pending.length : (habitGoal.completedDates?.length || 0);
                          const targetDays = editedTargetDays[goal.id] ? parseInt(editedTargetDays[goal.id]) : habitGoal.targetDays;
                          return targetDays ? `${completedCount} / ${targetDays} days` : `${completedCount} days`;
                        })()}
                      </Text>
                    )}
                  </View>
                  {(() => {
                    const habitGoal = goal as unknown as HabitGoal;
                    const targetDays = editedTargetDays[goal.id] ? parseInt(editedTargetDays[goal.id]) : habitGoal.targetDays;
                    return targetDays && (
                      <View style={styles.progressBarContainer}>
                        <View 
                          style={[
                            styles.progressBar,
                            { 
                              width: `${(() => {
                                const pending = pendingUpdates[goal.id];
                                const completedCount = pending ? pending.length : (habitGoal.completedDates?.length || 0);
                                return Math.min(100, (completedCount / targetDays) * 100);
                              })()}%` 
                            }
                          ]} 
                        />
                      </View>
                    );
                  })()}
                </View>
              )}

              <View style={styles.calendarSection}>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity 
                    style={[styles.monthNavButton, !canNavigateLeft(goal) && styles.monthNavButtonDisabled]}
                    onPress={() => canNavigateLeft(goal) && navigateMonth('left')}
                    disabled={!canNavigateLeft(goal)}
                  >
                    <ChevronLeft size={20} color={canNavigateLeft(goal) ? Colors.gray700 : Colors.gray300} />
                  </TouchableOpacity>
                  <Text style={styles.monthTitle}>
                    {getMonthName(displayMonth)}
                  </Text>
                  <TouchableOpacity 
                    style={[styles.monthNavButton, !canNavigateRight() && styles.monthNavButtonDisabled]}
                    onPress={() => canNavigateRight() && navigateMonth('right')}
                    disabled={!canNavigateRight()}
                  >
                    <ChevronRight size={20} color={canNavigateRight() ? Colors.gray700 : Colors.gray300} />
                  </TouchableOpacity>
                </View>

                <View style={styles.dayHeaders}>
                  {dayNames.map((day) => (
                    <Text key={day} style={styles.dayHeader}>{day}</Text>
                  ))}
                </View>

                <View style={styles.monthGrid}>
                  {monthDates.map((date, index) => (
                    <DayTile
                      key={`${goal.id}-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
                      goal={goal}
                      date={date}
                    />
                  ))}
                </View>
              </View>



              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {goal.xpEarned + (pendingXPUpdates[goal.id] || 0)}
                  </Text>
                  <Text style={styles.statLabel}>XP Earned</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {(() => {
                      const habitGoal = goal as unknown as HabitGoal;
                      const pending = pendingUpdates[goal.id];
                      return pending ? pending.length : (habitGoal.completedDates?.length || 0);
                    })()}
                  </Text>
                  <Text style={styles.statLabel}>Total Days</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{longestStreak}</Text>
                  <Text style={styles.statLabel}>Longest Streak</Text>
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
  habitCard: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    position: 'relative',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 16,
  },
  titleTextContainer: {
    flex: 1,
  },
  habitTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: 4,
  },
  habitDescription: {
    fontSize: 14,
    color: Colors.gray600,
    lineHeight: 20,
  },
  streakAndEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakContainer: {
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: 12,
    padding: 10,
    minWidth: 65,
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.gray900,
    marginTop: 4,
  },
  streakLabel: {
    fontSize: 12,
    color: Colors.gray500,
    textAlign: 'center',
  },
  calendarSection: {
    marginBottom: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.gray800,
    flex: 1,
    textAlign: 'center',
  },
  monthNavButton: {
    padding: 8,
    borderRadius: 8,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavButtonDisabled: {
    opacity: 0.3,
  },
  dayHeaders: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayHeader: {
    width: dayWidth,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray500,
    textAlign: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayContainer: {
    alignItems: 'center',
    width: dayWidth,
    marginBottom: 8,
    position: 'relative',
  },
  dayTouchable: {
    width: dayWidth - 4,
    height: dayWidth - 4,
  },
  disabledTouchable: {
    opacity: 0.6,
  },
  dayTile: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  completedTile: {
    backgroundColor: Colors.primary,
  },
  todayTile: {
    borderColor: Colors.primary,
  },
  otherMonthTile: {
    backgroundColor: Colors.gray50,
  },
  futureTile: {
    backgroundColor: Colors.gray100,
    opacity: 0.4,
  },
  beforeCreationTile: {
    backgroundColor: Colors.gray100,
    opacity: 0.3,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray700,
  },
  completedDayNumber: {
    color: Colors.white,
  },
  todayDayNumber: {
    color: Colors.primary,
  },
  otherMonthDayNumber: {
    color: Colors.gray300,
  },
  futureDayNumber: {
    color: Colors.gray300,
  },
  beforeCreationDayNumber: {
    color: Colors.gray200,
  },
  todayCompletedDayNumber: {
    color: '#FFD700',
    fontWeight: '700',
  },
  xpAnimation: {
    position: 'absolute',
    top: -15,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  xpText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },

  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  statItem: {
    alignItems: 'center',
    minWidth: '22%',
    marginBottom: 8,
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
  progressSection: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray800,
  },
  progressText: {
    fontSize: 14,
    color: Colors.gray600,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.gray200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  completedCard: {
    opacity: 0.7,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: Colors.gray500,
  },
  completedDescription: {
    textDecorationLine: 'line-through',
    color: Colors.gray400,
  },
  editButton: {
    padding: 8,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: Colors.white,
  },
  descriptionInput: {
    fontSize: 14,
    color: Colors.gray600,
    lineHeight: 20,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: Colors.white,
    minHeight: 24,
  },
  targetDaysEdit: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetDaysInput: {
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 14,
    color: Colors.gray700,
    backgroundColor: Colors.white,
    minWidth: 50,
    textAlign: 'center',
    marginRight: 4,
  },
  targetDaysLabel: {
    fontSize: 14,
    color: Colors.gray600,
  },
});