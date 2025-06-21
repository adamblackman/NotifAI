import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, TextInput } from 'react-native';
import { PiggyBank, Calendar, Flame, ChevronDown, Plus, Minus } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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
import { SaveGoal, Goal } from '@/types/Goal';

interface SaveTrackerProps {
  goals: SaveGoal[];
}

const { width } = Dimensions.get('window');
const dayWidth = (width - 64) / 7;

export function SaveTracker({ goals }: SaveTrackerProps) {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, { SaveDates: string[], currentAmount: number }>>({});
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());
  const [manualAmount, setManualAmount] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState<Record<string, boolean>>({});
  const { updateGoal, deleteGoal } = useGoals();
  const { addXP, checkAndAwardMedals } = useProfile();

  useEffect(() => {
    Object.keys(pendingUpdates).forEach(goalId => {
      const goal = goals.find(g => g.id === goalId);
      const pendingData = pendingUpdates[goalId];
      
      if (goal && pendingData && pendingOperations.size === 0) {
        const saveGoal = goal as unknown as SaveGoal;
        const currentSaveDates = saveGoal.SaveDates || [];
        const currentAmount = saveGoal.currentAmount || 0;
        
        const datesMatch = pendingData.SaveDates.length === currentSaveDates.length && 
          pendingData.SaveDates.every(date => currentSaveDates.includes(date)) &&
          currentSaveDates.every(date => pendingData.SaveDates.includes(date));
        
        const amountMatches = currentAmount === pendingData.currentAmount;
        
        if (datesMatch && amountMatches) {
          setPendingUpdates(prev => {
            const updated = { ...prev };
            delete updated[goalId];
            return updated;
          });
        }
      }
    });
  }, [goals, pendingUpdates, pendingOperations]);

  const getProgress = (goal: Goal) => {
    const SaveGoal = goal as unknown as SaveGoal;
    let targetAmount = SaveGoal.targetAmount || 0;
    let currentAmount = SaveGoal.currentAmount || 0;
    
    const pending = pendingUpdates[goal.id];
    if (pending) {
      currentAmount = pending.currentAmount;
    }
    
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
    const SaveGoal = goal as unknown as SaveGoal;
    const targetDate = SaveGoal.targetDate || SaveGoal.deadline;
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

  const isOverdue = (goal: Goal) => {
    const SaveGoal = goal as unknown as SaveGoal;
    const targetDate = SaveGoal.targetDate || SaveGoal.deadline;
    if (!targetDate) return false;
    
    const targetDateObj = new Date(targetDate);
    const now = new Date();
    return targetDateObj < now;
  };

  const getDailySaveAmount = (goal: Goal) => {
    const SaveGoal = goal as unknown as SaveGoal;
    const targetDate = SaveGoal.targetDate || SaveGoal.deadline;
    const targetAmount = SaveGoal.targetAmount || 0;
    
    if (!targetDate) return 5; // Default amount
    
    const now = new Date();
    const targetDateObj = new Date(targetDate);
    const diffTime = targetDateObj.getTime() - now.getTime();
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    return Math.max(1, Math.floor(targetAmount / diffDays));
  };

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

  const isSaveCompletedOnDate = (goal: Goal, date: Date) => {
    const SaveGoal = goal as unknown as SaveGoal;
    let SaveDates = SaveGoal.SaveDates || [];
    const dateStr = date.toISOString().split('T')[0];
    
    const pending = pendingUpdates[goal.id];
    if (pending) {
      SaveDates = pending.SaveDates;
    }
    
    return SaveDates.includes(dateStr);
  };

  const getCurrentStreakCount = (goal: Goal) => {
    const SaveGoal = goal as unknown as SaveGoal;
    let SaveDates = SaveGoal.SaveDates || [];
    
    const pending = pendingUpdates[goal.id];
    if (pending) {
      SaveDates = pending.SaveDates;
    }
    
    if (SaveDates.length === 0) return 0;

    const sortedDates = SaveDates.sort((a: string, b: string) => b.localeCompare(a));
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (const dateStr of sortedDates) {
      const date = new Date(dateStr);
      date.setHours(0, 0, 0, 0);
      const diffTime = currentDate.getTime() - date.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === streak || (streak === 0 && diffDays <= 1)) {
        streak++;
        currentDate = new Date(date.getTime() - 24 * 60 * 60 * 1000);
      } else {
        break;
      }
    }
    
    return streak;
  };

  const getLongestStreakCount = (goal: Goal) => {
    const SaveGoal = goal as unknown as SaveGoal;
    let SaveDates = SaveGoal.SaveDates || [];
    
    const pending = pendingUpdates[goal.id];
    if (pending) {
      SaveDates = pending.SaveDates;
    }
    
    if (SaveDates.length === 0) return 0;

    const sortedDates = SaveDates.sort((a: string, b: string) => a.localeCompare(b));
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
    if (streak === 0) return 1;
    return Math.max(1, Math.floor(Math.log2(streak + 1)));
  };

  const toggleSaveDate = async (goalId: string, date: Date) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const SaveGoal = goal as unknown as SaveGoal;
    const pendingData = pendingUpdates[goalId];
    const baseSaveDates = pendingData ? pendingData.SaveDates : (SaveGoal.SaveDates || []);
    const baseCurrentAmount = pendingData ? pendingData.currentAmount : (SaveGoal.currentAmount || 0);
    const dateStr = date.toISOString().split('T')[0];
    const isCompleted = baseSaveDates.includes(dateStr);
    
    const operationId = `${goalId}-${dateStr}-${Date.now()}`;
    const dailyAmount = getDailySaveAmount(goal);
    
    let newSaveDates;
    let newCurrentAmount = baseCurrentAmount;

    if (isCompleted) {
      newSaveDates = baseSaveDates.filter((d: string) => d !== dateStr);
      newCurrentAmount -= dailyAmount;
    } else {
      newSaveDates = [...baseSaveDates, dateStr];
      newCurrentAmount += dailyAmount;
    }

    setPendingOperations(prev => new Set([...prev, operationId]));
    setPendingUpdates(prev => ({
      ...prev,
      [goalId]: {
        SaveDates: newSaveDates,
        currentAmount: Math.max(0, newCurrentAmount)
      }
    }));

    // Calculate streak and XP
    const currentStreak = getCurrentStreakCount({ ...goal, SaveDates: newSaveDates } as Goal);
    const xpGained = calculateStreakXP(currentStreak);
    const xpChange = isCompleted ? -xpGained : xpGained;
    const newXpEarned = goal.xpEarned + xpChange;

    try {
      await updateGoal(goalId, {
        SaveDates: newSaveDates,
        currentAmount: Math.max(0, newCurrentAmount),
        xpEarned: newXpEarned,
      } as Partial<SaveGoal>);
      
      // Add XP to user profile
      await addXP(xpChange);
      
      setPendingOperations(prev => {
        const updated = new Set(prev);
        updated.delete(operationId);
        return updated;
      });
    } catch (error) {
      console.error('Error updating Save:', error);
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

  const handleManualAmountChange = async (goalId: string, amount: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const SaveGoal = goal as unknown as SaveGoal;
    const pendingData = pendingUpdates[goalId];
    const baseCurrentAmount = pendingData ? pendingData.currentAmount : (SaveGoal.currentAmount || 0);
    const newAmount = Math.max(0, baseCurrentAmount + amount);

    const operationId = `manual-${goalId}-${Date.now()}`;
    
    setPendingOperations(prev => new Set([...prev, operationId]));
    setPendingUpdates(prev => ({
      ...prev,
      [goalId]: {
        SaveDates: pendingData ? pendingData.SaveDates : (SaveGoal.SaveDates || []),
        currentAmount: newAmount
      }
    }));

    try {
      await updateGoal(goalId, {
        currentAmount: newAmount,
      } as Partial<SaveGoal>);
      
      setPendingOperations(prev => {
        const updated = new Set(prev);
        updated.delete(operationId);
        return updated;
      });
    } catch (error) {
      console.error('Error updating manual amount:', error);
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

  const handleDateChange = async (goalId: string, event: any, selectedDate?: Date) => {
    setShowDatePicker(prev => ({ ...prev, [goalId]: false }));
    
    if (selectedDate) {
      try {
        await updateGoal(goalId, {
          deadline: selectedDate,
          targetDate: selectedDate,
        } as Partial<SaveGoal>);
      } catch (error) {
        console.error('Error updating deadline:', error);
      }
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
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate > today;
  };

  const DayTile = ({ goal, date }: { goal: Goal; date: Date }) => {
    const isCompleted = isSaveCompletedOnDate(goal, date);
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
        const currentStreak = getCurrentStreakCount(goal);
        const xpGained = calculateStreakXP(currentStreak + 1);
        const dailyAmount = getDailySaveAmount(goal);
        
        xpOpacity.value = withTiming(1, { duration: 200 });
        xpTranslateY.value = withTiming(-40, { 
          duration: 1000, 
          easing: Easing.out(Easing.cubic) 
        }, () => {
          xpOpacity.value = withTiming(0, { duration: 200 });
          xpTranslateY.value = 0;
        });
      }

      runOnJS(toggleSaveDate)(goal.id, date);
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
          <Text style={styles.xpText}>+{calculateStreakXP(getCurrentStreakCount(goal) + 1)} XP / +{formatCurrency(getDailySaveAmount(goal))}</Text>
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
    
    let currentMonth = new Date(goalCreatedAt.getFullYear(), goalCreatedAt.getMonth(), 1);
    
    while (currentMonth <= today) {
      const monthsFromNow = (currentMonth.getFullYear() - today.getFullYear()) * 12 + 
                           (currentMonth.getMonth() - today.getMonth());
      
      if (monthsFromNow < 0) {
        months.push({
          offset: monthsFromNow,
          name: getMonthName(currentMonth),
          month: new Date(currentMonth)
        });
      }
      
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }
    
    return months.reverse();
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {goals.map((goal) => {
          const SaveGoal = goal as unknown as SaveGoal;
          const progress = getProgress(goal);
          const timeRemaining = getTimeRemaining(goal);
          const currentStreak = getCurrentStreakCount(goal);
          const longestStreak = getLongestStreakCount(goal);
          const flameProps = getFlameIntensity(currentStreak);
          const availableMonths = getAvailableMonths(goal);
          const dailyAmount = getDailySaveAmount(goal);

          return (
            <View key={goal.id} style={styles.SaveCard}>
              <View style={styles.cardHeader}>
                <View style={styles.titleContainer}>
                  <View style={styles.titleTextContainer}>
                    <Text style={styles.SaveTitle}>{goal.title}</Text>
                    {goal.description && (
                      <Text style={styles.SaveDescription}>{goal.description}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.streakContainer}>
                  <Flame size={flameProps.size} color={flameProps.color} />
                  <Text style={styles.streakNumber}>{currentStreak}</Text>
                  <Text style={styles.streakLabel}>day streak</Text>
                </View>
              </View>

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

                {timeRemaining && (
                  <TouchableOpacity 
                    style={styles.countdownContainer}
                    onPress={() => setShowDatePicker(prev => ({ ...prev, [goal.id]: true }))}
                  >
                    <Calendar size={16} color={isOverdue(goal) ? Colors.error : Colors.gray500} />
                    <Text style={[
                      styles.countdownText,
                      isOverdue(goal) && styles.overdueText
                    ]}>
                      {timeRemaining}
                    </Text>
                  </TouchableOpacity>
                )}

                {showDatePicker[goal.id] && (
                  <DateTimePicker
                    value={SaveGoal.deadline ? new Date(SaveGoal.deadline) : new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => handleDateChange(goal.id, event, selectedDate)}
                  />
                )}
              </View>

              <View style={styles.calendarSection}>
                <View style={styles.calendarHeader}>
                  <Text style={styles.monthTitle}>
                    {getMonthName(displayMonth)}
                  </Text>
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

              <View style={styles.manualAmountContainer}>
                <Text style={styles.manualAmountLabel}>Manual Adjustment:</Text>
                <View style={styles.manualAmountControls}>
                  <TextInput
                    style={styles.manualAmountInput}
                    placeholder="Amount"
                    value={manualAmount[goal.id] || ''}
                    onChangeText={(text) => setManualAmount(prev => ({ ...prev, [goal.id]: text }))}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity 
                    style={[styles.amountButton, styles.subtractButton]}
                    onPress={() => {
                      const amount = parseFloat(manualAmount[goal.id] || '0');
                      if (amount > 0) {
                        handleManualAmountChange(goal.id, -amount);
                        setManualAmount(prev => ({ ...prev, [goal.id]: '' }));
                      }
                    }}
                  >
                    <Minus size={16} color={Colors.white} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.amountButton}
                    onPress={() => {
                      const amount = parseFloat(manualAmount[goal.id] || '0');
                      if (amount > 0) {
                        handleManualAmountChange(goal.id, amount);
                        setManualAmount(prev => ({ ...prev, [goal.id]: '' }));
                      }
                    }}
                  >
                    <Plus size={16} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              </View>

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

              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{goal.xpEarned}</Text>
                  <Text style={styles.statLabel}>XP Earned</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {formatCurrency(progress.target - progress.current)}
                  </Text>
                  <Text style={styles.statLabel}>Remaining</Text>
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
  SaveCard: {
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
  SaveTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: 4,
  },
  SaveDescription: {
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
    marginBottom: 16,
  },
  countdownText: {
    fontSize: 14,
    color: Colors.gray500,
    marginLeft: 6,
  },
  overdueText: {
    color: Colors.error,
    fontWeight: '600',
  },
  manualAmountContainer: {
    backgroundColor: Colors.gray50,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  manualAmountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray700,
    marginBottom: 8,
  },
  manualAmountControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  manualAmountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: Colors.white,
  },
  amountButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtractButton: {
    backgroundColor: Colors.error,
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
    color: '#FFD700',
    fontWeight: '700',
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