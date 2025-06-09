import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Repeat, SquareCheck as CheckSquare, BookOpen, PiggyBank } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Card } from '@/components/ui/Card';
import { GoalCategory } from '@/types/Goal';

interface GoalCategoryTileProps {
  category: GoalCategory;
  count: number;
  onPress: () => void;
}

const categoryConfig = {
  habit: {
    title: 'Habits',
    icon: Repeat,
    color: Colors.primary,
  },
  project: {
    title: 'Projects',
    icon: CheckSquare,
    color: Colors.success,
  },
  learn: {
    title: 'Learn',
    icon: BookOpen,
    color: Colors.warning,
  },
  save: {
    title: 'Save',
    icon: PiggyBank,
    color: Colors.error,
  },
};

export function GoalCategoryTile({ category, count, onPress }: GoalCategoryTileProps) {
  const config = categoryConfig[category];
  const Icon = config.icon;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={styles.card}>
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: `${config.color}15` }]}>
            <Icon size={24} color={config.color} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{config.title}</Text>
            <Text style={styles.count}>{count} active</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray800,
    marginBottom: 2,
  },
  count: {
    fontSize: 14,
    color: Colors.gray500,
  },
});