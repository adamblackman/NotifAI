import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Repeat, SquareCheck as CheckSquare, BookOpen, PiggyBank, ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Card } from '@/components/ui/Card';
import { GoalCategory } from '@/types/Goal';

interface CategoryPickerProps {
  onSelect: (category: GoalCategory) => void;
}

const categories = [
  {
    id: 'habit' as GoalCategory,
    title: 'Habit',
    description: 'Build daily routines',
    icon: Repeat,
    color: Colors.primary,
  },
  {
    id: 'project' as GoalCategory,
    title: 'Project',
    description: 'Complete a goal',
    icon: CheckSquare,
    color: Colors.success,
  },
  {
    id: 'learning' as GoalCategory,
    title: 'Learning',
    description: 'Acquire new skills',
    icon: BookOpen,
    color: Colors.warning,
  },
  {
    id: 'saving' as GoalCategory,
    title: 'Saving',
    description: 'Save up!',
    icon: PiggyBank,
    color: Colors.error,
  },
];

export function CategoryPicker({ onSelect }: CategoryPickerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={Colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.title}>Choose Goal Type</Text>
      </View>
      <View style={styles.grid}>
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <TouchableOpacity
              key={category.id}
              onPress={() => onSelect(category.id)}
              activeOpacity={0.8}
              style={styles.categoryButton}
            >
              <Card style={styles.categoryCard}>
                <View style={[styles.iconContainer, { backgroundColor: `${category.color}15` }]}>
                  <Icon size={32} color={category.color} />
                </View>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categoryDescription}>{category.description}</Text>
              </Card>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.gray800,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryButton: {
    width: '48%',
    marginBottom: 16,
  },
  categoryCard: {
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray800,
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: Colors.gray500,
    textAlign: 'center',
  },
});