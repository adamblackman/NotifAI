import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Repeat, SquareCheck as CheckSquare, BookOpen, PiggyBank, Award } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';

interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'habit' | 'project' | 'learn' | 'save';
  data: Record<string, any>;
  xpEarned: number;
  createdAt: string;
  completedAt: string | null;
  updatedAt: string;
}

interface GoalTileProps {
  goal: Goal;
  onPress: () => void;
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

export function GoalTile({ goal, onPress }: GoalTileProps) {
  const config = categoryConfig[goal.category];
  
  if (!config) {
    console.warn(`Unknown goal category: ${goal.category}. Available categories:`, Object.keys(categoryConfig));
    return null;
  }
  
  const Icon = config.icon;
  const isCompleted = !!goal.completedAt;

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        isCompleted && styles.completedContainer
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
              <Text style={[styles.title, isCompleted && styles.completedTitle]}>
                {goal.title}
              </Text>
              <Text style={styles.categoryLabel}>{config.label}</Text>
            </View>
          </View>
          
          <View style={styles.rightSection}>
            {isCompleted && (
              <View style={styles.completionBadge}>
                <Award size={16} color={Colors.warning} />
              </View>
            )}
            <Text style={styles.xpText}>{goal.xpEarned} XP</Text>
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