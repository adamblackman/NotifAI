import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Repeat, SquareCheck as CheckSquare, BookOpen, PiggyBank } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';

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
  learning: {
    icon: BookOpen,
    color: Colors.warning,
    label: 'Learning',
  },
  saving: {
    icon: PiggyBank,
    color: Colors.error,
    label: 'Saving',
  },
};

export function GoalTile({ goal, onPress }: GoalTileProps) {
  const config = categoryConfig[goal.category];
  const Icon = config.icon;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={[styles.iconContainer, { backgroundColor: `${config.color}15` }]}>
              <Icon size={20} color={config.color} />
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{goal.title}</Text>
              <Text style={styles.categoryLabel}>{config.label}</Text>
            </View>
          </View>
          <Text style={styles.xpText}>{goal.xpEarned} XP</Text>
        </View>
        
        {goal.description && (
          <Text style={styles.description} numberOfLines={2}>
            {goal.description}
          </Text>
        )}
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
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
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
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray500,
    textTransform: 'uppercase',
  },
  xpText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray600,
  },
  description: {
    fontSize: 14,
    color: Colors.gray600,
    lineHeight: 20,
    marginTop: 4,
  },
});