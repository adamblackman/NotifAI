import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Repeat, Flame, Calendar, ChevronDown } from 'lucide-react-native';
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
import { HabitGoal, Goal } from '@/types/Goal';

interface HabitTrackerProps {
  goals: HabitGoal[];
}

const { width } = Dimensions.get('window');
const dayWidth = (width - 64) / 7;

export function HabitTracker({ goals }: HabitTrackerProps) {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null); // null = current month
  const [showHistory, setShowHistory] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, string[]>>({});
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());
  const { updateGoal } = useGoals();

  // Clear pending updates when the goals data is updated to match pending state AND no operations are pending
  useEffect(() => {
    Object.keys(pendingUpdates).forEach(goalId => {
      const goal = goals.find(g => g.id === goalId);
      const pendingDates = pendingUpdates[goalId];
      
      if (goal && pendingOperations.size === 0) { // Only clear if no operations are pending
        const habitGoal = goal as unknown as HabitGoal;
        const currentDates = habitGoal.completedDates || [];
        
        // Check if the current goal data matches our pending updates
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
    
    // Get first day of month and adjust to start on Monday
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(firstDay.getDate() + mondayOffset);
    
    // Generate 6 weeks (42 days) to cover the full month view
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
    
    // Check if there's a pending update for this goal
    const pending = pendingUpdates[goal.id];
    if (pending) {
      const result = pending.includes(dateStr);
      return result;
    }
    
    const result = completedDates.includes(dateStr);
    return result;
  };

  const getStreakCount = (goal: Goal) => {
    const habitGoal = goal as unknown as HabitGoal;
    let completedDates = habitGoal.completedDates || [];
    
    // Use pending updates if available
    const pending = pendingUpdates[goal.id];
    if (pending) {
      completedDates = pending;
    }
    
    if (completedDates.length === 0) return 0;

    const sortedDates = completedDates.sort((a: string, b: string) => b.localeCompare(a));
    let streak = 0;
    let currentDate = new Date();
    
    for (const dateStr of sortedDates) {
      const date = new Date(dateStr);
      const diffTime = currentDate.getTime() - date.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === streak + 1 || (streak === 0 && diffDays <= 1)) {
        streak++;
        currentDate = date;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const toggleHabitDate = async (goalId: string, date: Date) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const habitGoal = goal as unknown as HabitGoal;
    // Use pending updates as base if they exist, otherwise use goal data
    const baseDates = pendingUpdates[goalId] || habitGoal.completedDates || [];
    const dateStr = date.toISOString().split('T')[0];
    const isCompleted = baseDates.includes(dateStr);
    
    // Create unique operation ID
    const operationId = `${goalId}-${dateStr}-${Date.now()}`;
        
    let newCompletedDates;
    if (isCompleted) {
      newCompletedDates = baseDates.filter((d: string) => d !== dateStr);
    } else {
      newCompletedDates = [...baseDates, dateStr];
    }
    
    // Track this operation and update local state for instant UI feedback
    setPendingOperations(prev => new Set([...prev, operationId]));
    setPendingUpdates(prev => {
      const updated = {
        ...prev,
        [goalId]: newCompletedDates
      };
      return updated;
    });

    const xpChange = isCompleted ? -10 : 10;
    const newXpEarned = goal.xpEarned + xpChange;

    try {
      await updateGoal(goalId, {
        completedDates: newCompletedDates,
        xpEarned: newXpEarned,
      });
      
      // Remove this operation from pending
      setPendingOperations(prev => {
        const updated = new Set(prev);
        updated.delete(operationId);
        return updated;
      });
    } catch (error) {
      console.error('Error updating habit:', error);
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

  const isFutureDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate > today;
  };

  const DayTile = ({ goal, date }: { goal: Goal; date: Date }) => {
    const isCompleted = isHabitCompletedOnDate(goal, date);
    const scale = useSharedValue(1);
    const xpOpacity = useSharedValue(0);
    const xpTranslateY = useSharedValue(0);
    const isTodayDate = isToday(date);
    const isCurrentMonthDate = isCurrentMonth(date);
    const isFuture = isFutureDate(date);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const xpAnimatedStyle = useAnimatedStyle(() => ({
      opacity: xpOpacity.value,
      transform: [{ translateY: xpTranslateY.value }],
    }));

    const handlePress = () => {
      if (!isCurrentMonthDate || isFuture) return;

      scale.value = withSequence(
        withSpring(0.9, { duration: 100 }),
        withSpring(1, { duration: 100 })
      );

      if (!isCompleted) {
        xpOpacity.value = withTiming(1, { duration: 200 });
        xpTranslateY.value = withTiming(-40, { 
          duration: 1000, 
          easing: Easing.out(Easing.cubic) 
        }, () => {
          xpOpacity.value = withTiming(0, { duration: 200 });
          xpTranslateY.value = 0;
        });
      }

      runOnJS(toggleHabitDate)(goal.id, date);
    };

    return (
      <View style={styles.dayContainer}>
        <TouchableOpacity 
          onPress={handlePress} 
          disabled={!isCurrentMonthDate || isFuture}
          style={[
            styles.dayTouchable,
            (!isCurrentMonthDate || isFuture) && styles.disabledTouchable
          ]}
        >
          <Animated.View style={[
            styles.dayTile,
            isCompleted && styles.completedTile,
            isTodayDate && styles.todayTile,
            !isCurrentMonthDate && styles.otherMonthTile,
            isFuture && styles.futureTile,
            animatedStyle
          ]}>
            <Text style={[
              styles.dayNumber,
              isCompleted && styles.completedDayNumber,
              isTodayDate && styles.todayDayNumber,
              !isCurrentMonthDate && styles.otherMonthDayNumber,
              isFuture && styles.futureDayNumber,
              isTodayDate && isCompleted && styles.todayCompletedDayNumber
            ]}>
              {date.getDate()}
            </Text>
          </Animated.View>
        </TouchableOpacity>
        
        <Animated.View style={[styles.xpAnimation, xpAnimatedStyle]}>
          <Text style={styles.xpText}>+10 XP</Text>
        </Animated.View>
      </View>
    );
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getAvailableMonths = (goal: Goal) => {
    const goalCreatedAt = new Date(goal.createdAt);
    const today = new Date();
    const months = [];
    
    // Start from the month the goal was created
    let currentMonth = new Date(goalCreatedAt.getFullYear(), goalCreatedAt.getMonth(), 1);
    
    // Go up to the current month
    while (currentMonth <= today) {
      const monthsFromNow = (currentMonth.getFullYear() - today.getFullYear()) * 12 + 
                           (currentMonth.getMonth() - today.getMonth());
      
      if (monthsFromNow < 0) { // Only past months
        months.push({
          offset: monthsFromNow,
          name: getMonthName(currentMonth),
          month: new Date(currentMonth)
        });
      }
      
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }
    
    return months.reverse(); // Most recent first
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {goals.map((goal) => {
        const streak = getStreakCount(goal);
        const flameProps = getFlameIntensity(streak);
        const availableMonths = getAvailableMonths(goal);

        return (
          <View key={goal.id} style={styles.habitCard}>
            {/* Header with habit icon, title and streak */}
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <Repeat size={24} color={Colors.primary} />
                <View style={styles.titleTextContainer}>
                  <Text style={styles.habitTitle}>{goal.title}</Text>
                  {goal.description && (
                    <Text style={styles.habitDescription}>{goal.description}</Text>
                  )}
                </View>
              </View>
              <View style={styles.streakContainer}>
                <Flame size={flameProps.size} color={flameProps.color} />
                <Text style={styles.streakNumber}>{streak}</Text>
                <Text style={styles.streakLabel}>day streak</Text>
              </View>
            </View>

            {/* Progress bar for target days */}
            {(goal as unknown as HabitGoal).targetDays && (
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>Progress</Text>
                  <Text style={styles.progressText}>
                    {(() => {
                      const habitGoal = goal as unknown as HabitGoal;
                      const pending = pendingUpdates[goal.id];
                      const completedCount = pending ? pending.length : (habitGoal.completedDates?.length || 0);
                      return `${completedCount} / ${habitGoal.targetDays} days`;
                    })()}
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar,
                      { 
                        width: `${(() => {
                          const habitGoal = goal as unknown as HabitGoal;
                          const pending = pendingUpdates[goal.id];
                          const completedCount = pending ? pending.length : (habitGoal.completedDates?.length || 0);
                          return Math.min(100, (completedCount / habitGoal.targetDays!) * 100);
                        })()}%` 
                      }
                    ]} 
                  />
                </View>
              </View>
            )}

            {/* Monthly calendar */}
            <View style={styles.calendarSection}>
              <View style={styles.calendarHeader}>
                <Text style={styles.monthTitle}>
                  {getMonthName(displayMonth)}
                </Text>
              </View>

              {/* Day headers */}
              <View style={styles.dayHeaders}>
                {dayNames.map((day) => (
                  <Text key={day} style={styles.dayHeader}>{day}</Text>
                ))}
              </View>

              {/* Calendar grid */}
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

            {/* History section - only show if there are available months */}
            {availableMonths.length > 0 && (
              <View style={styles.historySection}>
                <TouchableOpacity 
                  style={styles.historyHeader}
                  onPress={() => setShowHistory(!showHistory)}
                >
                  <Text style={styles.historyTitle}>History</Text>
                  <ChevronDown 
                    size={16} 
                    color={Colors.gray500} 
                    style={[
                      styles.historyChevron,
                      showHistory && styles.historyChevronRotated
                    ]}
                  />
                </TouchableOpacity>

                {showHistory && (
                  <View style={styles.historyList}>
                    {availableMonths.map((monthData) => (
                      <TouchableOpacity
                        key={monthData.offset}
                        style={styles.historyItem}
                        onPress={() => {
                          setSelectedMonth(monthData.offset);
                          setShowHistory(false);
                        }}
                      >
                        <Text style={styles.historyItemText}>{monthData.name}</Text>
                      </TouchableOpacity>
                    ))}
                    {selectedMonth !== null && (
                      <TouchableOpacity
                        style={styles.historyItem}
                        onPress={() => {
                          setSelectedMonth(null);
                          setShowHistory(false);
                        }}
                      >
                        <Text style={[styles.historyItemText, styles.currentMonthText]}>
                          Current Month
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{goal.xpEarned}</Text>
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
                <Text style={styles.statValue}>{streak}</Text>
                <Text style={styles.statLabel}>Best Streak</Text>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 16,
  },
  titleTextContainer: {
    flex: 1,
    marginLeft: 12,
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
  streakContainer: {
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: 12,
    padding: 12,
    minWidth: 80,
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
    alignItems: 'center',
    marginBottom: 16,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.gray800,
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
  todayCompletedDayNumber: {
    color: '#FFD700', // Gold color
    fontWeight: '700',
  },
  xpAnimation: {
    position: 'absolute',
    top: -10,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  xpText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  historySection: {
    marginBottom: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.gray50,
    borderRadius: 8,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray700,
  },
  historyChevron: {
    transform: [{ rotate: '0deg' }],
  },
  historyChevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  historyList: {
    marginTop: 8,
    backgroundColor: Colors.gray50,
    borderRadius: 8,
    overflow: 'hidden',
  },
  historyItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  historyItemText: {
    fontSize: 14,
    color: Colors.gray700,
  },
  currentMonthText: {
    fontWeight: '600',
    color: Colors.primary,
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
});