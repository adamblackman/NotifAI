import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { PiggyBank, Calendar, Flame, ChevronDown } from 'lucide-react-native';
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
import { SavingGoal } from '@/types/Goal';

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

interface SavingTrackerProps {
  goals: Goal[];
}

const { width } = Dimensions.get('window');
const dayWidth = (width - 64) / 7;

export function SavingTracker({ goals }: SavingTrackerProps) {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null); // null = current month
  const [showHistory, setShowHistory] = useState(false);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, { savingDates: string[], currentAmount: number, xpEarned: number }>>({});
  const { updateGoal } = useGoals();

  const getOptimisticGoal = (goal: Goal) => {
    const optimistic = optimisticUpdates[goal.id];
    if (!optimistic) return goal;
    
    return {
      ...goal,
      data: {
        ...goal.data,
        savingDates: optimistic.savingDates,
        currentAmount: optimistic.currentAmount,
      },
      xpEarned: optimistic.xpEarned,
    };
  };

  const getProgress = (goal: Goal) => {
    const optimisticGoal = getOptimisticGoal(goal);
    const savingGoal = optimisticGoal as unknown as SavingGoal;
    const targetAmount = savingGoal.targetAmount || 0;
    const currentAmount = savingGoal.currentAmount || 0;
    return {
      current: currentAmount,
      target: targetAmount,
      percentage: targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0,
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getTimeRemaining = (goal: Goal) => {
    const savingGoal = goal as unknown as SavingGoal;
    const targetDate = savingGoal.targetDate || savingGoal.deadline;
    if (!targetDate) return null;
    
    const targetDateObj = new Date(targetDate);
    const now = new Date();
    const diffTime = targetDateObj.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return '1 day left';
    if (diffDays < 30) return `${diffDays} days left`;
    
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} left`;
  };

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

  const isSavingCompletedOnDate = (goal: Goal, date: Date) => {
    const optimisticGoal = getOptimisticGoal(goal);
    const savingGoal = optimisticGoal as unknown as SavingGoal;
    const savingDates = savingGoal.savingDates || [];
    const dateStr = date.toISOString().split('T')[0];
    return savingDates.includes(dateStr);
  };

  const getStreakCount = (goal: Goal) => {
    const optimisticGoal = getOptimisticGoal(goal);
    const savingGoal = optimisticGoal as unknown as SavingGoal;
    const savingDates = savingGoal.savingDates || [];
    if (savingDates.length === 0) return 0;

    const sortedDates = savingDates.sort((a: string, b: string) => b.localeCompare(a));
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

  const toggleSavingDate = async (goalId: string, date: Date, amount: number = 5) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const savingGoal = goal as unknown as SavingGoal;
    const savingDates = savingGoal.savingDates || [];
    const dateStr = date.toISOString().split('T')[0];
    const isCompleted = savingDates.includes(dateStr);

    let newSavingDates;
    let newCurrentAmount = savingGoal.currentAmount || 0;

    if (isCompleted) {
      // Unselect: remove date and subtract amount
      newSavingDates = savingDates.filter((d: string) => d !== dateStr);
      newCurrentAmount -= amount;
    } else {
      // Select: add date and add amount
      newSavingDates = [...savingDates, dateStr];
      newCurrentAmount += amount;
    }

    const xpChange = isCompleted ? -amount : amount;
    const newXpEarned = goal.xpEarned + xpChange;

    // Immediate optimistic update
    setOptimisticUpdates(prev => ({
      ...prev,
      [goalId]: {
        savingDates: newSavingDates,
        currentAmount: Math.max(0, newCurrentAmount),
        xpEarned: newXpEarned,
      }
    }));

    try {
      await updateGoal(goalId, {
        ...goal,
        savingDates: newSavingDates,
        currentAmount: Math.max(0, newCurrentAmount),
        xpEarned: newXpEarned,
      });

      // Clear optimistic update after successful save
      setOptimisticUpdates(prev => {
        const newUpdates = { ...prev };
        delete newUpdates[goalId];
        return newUpdates;
      });
    } catch (error) {
      console.error('Error updating saving:', error);
      // Revert optimistic update on error
      setOptimisticUpdates(prev => {
        const newUpdates = { ...prev };
        delete newUpdates[goalId];
        return newUpdates;
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
    const isCompleted = isSavingCompletedOnDate(goal, date);
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
      // Don't allow interaction with future dates or non-current month dates
      if (!isCurrentMonthDate || isFuture) return;

      // Always animate the button press
      scale.value = withSequence(
        withSpring(0.9, { duration: 100 }),
        withSpring(1, { duration: 100 })
      );

      // Only show XP popup when selecting (not unselecting)
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

      runOnJS(toggleSavingDate)(goal.id, date, 5);
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
              isFuture && styles.futureDayNumber
            ]}>
              {date.getDate()}
            </Text>
          </Animated.View>
        </TouchableOpacity>
        
        <Animated.View style={[styles.xpAnimation, xpAnimatedStyle]}>
          <Text style={styles.xpText}>+$5 XP / +$5 saved</Text>
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
        const optimisticGoal = getOptimisticGoal(goal);
        const savingGoal = optimisticGoal as unknown as SavingGoal;
        const progress = getProgress(goal);
        const timeRemaining = getTimeRemaining(goal);
        const streak = getStreakCount(goal);
        const flameProps = getFlameIntensity(streak);
        const availableMonths = getAvailableMonths(goal);

        return (
          <View key={goal.id} style={styles.savingCard}>
            {/* Header with saving icon, title and streak */}
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <PiggyBank size={24} color={Colors.primary} />
                <View style={styles.titleTextContainer}>
                  <Text style={styles.savingTitle}>{goal.title}</Text>
                  {goal.description && (
                    <Text style={styles.savingDescription}>{goal.description}</Text>
                  )}
                </View>
              </View>
              <View style={styles.streakContainer}>
                <Flame size={flameProps.size} color={flameProps.color} />
                <Text style={styles.streakNumber}>{streak}</Text>
                <Text style={styles.streakLabel}>day streak</Text>
              </View>
            </View>

            {/* Large progress bar */}
            <View style={styles.progressSection}>
              <View style={styles.amountHeader}>
                <Text style={styles.currentAmount}>
                  {formatCurrency(progress.current)}
                </Text>
                <Text style={styles.targetAmount}>
                  of {formatCurrency(progress.target)}
                </Text>
              </View>
              
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <Animated.View style={[
                    styles.progressFill,
                    { width: `${Math.min(progress.percentage, 100)}%` }
                  ]} />
                </View>
                <Text style={styles.percentageText}>
                  {Math.round(progress.percentage)}%
                </Text>
              </View>

              {/* Target date countdown */}
              {timeRemaining && (
                <View style={styles.countdownContainer}>
                  <Calendar size={16} color={Colors.gray500} />
                  <Text style={styles.countdownText}>{timeRemaining}</Text>
                </View>
              )}
            </View>

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
                    key={date.toISOString()}
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
                <Text style={styles.statValue}>{optimisticGoal.xpEarned}</Text>
                <Text style={styles.statLabel}>XP Earned</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {formatCurrency(progress.target - progress.current)}
                </Text>
                <Text style={styles.statLabel}>Remaining</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{streak}</Text>
                <Text style={styles.statLabel}>Streak</Text>
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
  savingCard: {
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
  savingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: 4,
  },
  savingDescription: {
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
  progressSection: {
    marginBottom: 24,
  },
  amountHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  currentAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.gray900,
    marginRight: 8,
  },
  targetAmount: {
    fontSize: 18,
    color: Colors.gray500,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 16,
    backgroundColor: Colors.gray200,
    borderRadius: 8,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    minWidth: 40,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  countdownText: {
    fontSize: 14,
    color: Colors.gray500,
    marginLeft: 6,
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
  xpAnimation: {
    position: 'absolute',
    top: -10,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 120,
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
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
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