import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Repeat, SquareCheck as CheckSquare, BookOpen, PiggyBank, Award } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Goal, ProjectGoal, Task, HabitGoal, LearnGoal, SaveGoal, CurriculumItem } from '@/types/Goal';

interface GoalTileProps {
  goal: Goal;
  onPress: () => void;
  isCompleted?: boolean;
}

const categoryConfig = {
  habit: {
    icon: Repeat,
    color: Colors.primary,
    label: 'Habit',
  },
  project: {
    icon: CheckSquare,
    color: Colors.success,
    label: 'Project',
  },
  learn: {
    icon: BookOpen,
    color: Colors.warning,
    label: 'Learn',
  },
  save: {
    icon: PiggyBank,
    color: Colors.error,
    label: 'Save',
  },
};

export function GoalTile({ goal, onPress, isCompleted = false }: GoalTileProps) {
  const config = categoryConfig[goal.category];
  
  if (!config) {
    console.warn(`Unknown goal category: ${goal.category}. Available categories:`, Object.keys(categoryConfig));
    return null;
  }
  
  const Icon = config.icon;
  const showCompleted = isCompleted || !!goal.completedAt;

  // Calculate completion percentage for each goal type
  const getCompletionPercentage = () => {
    switch (goal.category) {
      case 'habit': {
        const habitGoal = goal as unknown as HabitGoal;
        const completedDays = habitGoal.completedDates?.length || 0;
        const targetDays = habitGoal.targetDays || 0;
        return targetDays > 0 ? Math.round((completedDays / targetDays) * 100) : 0;
      }
      case 'project': {
        const projectGoal = goal as unknown as ProjectGoal;
        const tasks = projectGoal.tasks || [];
        const completedTasks = tasks.filter((task: Task) => task.completed).length;
        return tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
      }
      case 'learn': {
        const learnGoal = goal as unknown as LearnGoal;
        const lessons = learnGoal.curriculumItems || [];
        const completedLessons = lessons.filter((item: CurriculumItem) => item.completed).length;
        return lessons.length > 0 ? Math.round((completedLessons / lessons.length) * 100) : 0;
      }
      case 'save': {
        const saveGoal = goal as unknown as SaveGoal;
        const currentAmount = saveGoal.currentAmount || 0;
        const targetAmount = saveGoal.targetAmount || 0;
        return targetAmount > 0 ? Math.round((currentAmount / targetAmount) * 100) : 0;
      }
      default:
        return 0;
    }
  };

  const completionPercentage = getCompletionPercentage();

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        showCompleted && styles.completedContainer
      ]} 
      onPress={onPress} 
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={[styles.iconContainer, { backgroundColor: `${config.color}15` }]}>
              <Icon size={20} color={config.color} />
            </View>
            <View style={styles.titleContainer}>
              <Text style={[styles.title, showCompleted && styles.completedTitle]}>
                {goal.title}
              </Text>
              <Text style={styles.categoryLabel}>{config.label}</Text>
            </View>
          </View>
          
          <View style={styles.rightSection}>
            {showCompleted && (
              <View style={styles.completionBadge}>
                <Award size={16} color={Colors.warning} />
              </View>
            )}
            <Text style={styles.xpText}>
              {completionPercentage}%
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  completedContainer: {
    opacity: 0.7,
    backgroundColor: Colors.gray50,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: 2,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: Colors.gray500,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray500,
    textTransform: 'uppercase',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completionBadge: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 4,
  },
  xpText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray600,
  },
});