import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Stack } from 'expo-router';
import { ArrowLeft, Award, Repeat, SquareCheck as CheckSquare, BookOpen, PiggyBank } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { useProfile } from '@/hooks/useProfile';
import { useGoals } from '@/hooks/useGoals';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';

const medalColors = {
  bronze: Colors.medal.bronze,
  silver: Colors.medal.silver,
  gold: Colors.medal.gold,
  diamond: Colors.medal.diamond,
};

const achievementThresholds = {
  bronze: 1,
  silver: 10,
  gold: 50,
  diamond: 100,
};

const achievementXP = {
  bronze: 10,
  silver: 100,
  gold: 1000,
  diamond: 10000,
};

const categoryConfig = {
  habit: {
    icon: Repeat,
    color: Colors.primary,
    label: 'Habits',
  },
  project: {
    icon: CheckSquare,
    color: Colors.success,
    label: 'Projects',
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

export default function AchievementsScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const { profile } = useProfile();
  const { goals } = useGoals();

  if (!category || !categoryConfig[category as keyof typeof categoryConfig]) {
    return null;
  }

  const config = categoryConfig[category as keyof typeof categoryConfig];
  const Icon = config.icon;
  const medals = profile.medals[category as keyof typeof profile.medals] || [];

  // Calculate completed goals for this category
  const { isGoalCompleted } = useGoals();
  const categoryGoals = goals.filter(goal => goal.category === category);
  const totalCompletions = categoryGoals.filter(goal => isGoalCompleted(goal)).length;

  const renderAchievement = (medalType: keyof typeof achievementThresholds) => {
    const threshold = achievementThresholds[medalType];
    const earned = medals.includes(medalType);
    const progress = Math.min(100, (totalCompletions / threshold) * 100);
    const xpReward = achievementXP[medalType];

    return (
      <Card key={medalType} style={styles.achievementCard}>
        <View style={styles.achievementHeader}>
          <View style={[
            styles.medalContainer,
            { backgroundColor: earned ? `${medalColors[medalType]}20` : Colors.gray100 }
          ]}>
            <Award
              size={32}
              color={earned ? medalColors[medalType] : Colors.gray300}
            />
          </View>
          <View style={styles.achievementInfo}>
            <Text style={styles.medalName}>
              {medalType.charAt(0).toUpperCase() + medalType.slice(1)} Medal
            </Text>
            <Text style={styles.medalDescription}>
              Complete {threshold} {category === 'habit' ? 'habit goals' : 
                      category === 'project' ? 'project goals' :
                      category === 'learn' ? 'learn goals' :
                      'save goals'}
            </Text>
            {!earned && (
              <Text style={styles.xpReward}>+{xpReward.toLocaleString()} XP</Text>
            )}
          </View>
          {earned && (
            <View style={styles.earnedBadge}>
              <Text style={styles.earnedText}>Earned!</Text>
            </View>
          )}
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>
              {totalCompletions} / {threshold} completions
            </Text>
            <Text style={styles.progressPercentage}>
              {Math.round(progress)}%
            </Text>
          </View>
          <ProgressBar 
            progress={progress} 
            height={8} 
            color={earned ? medalColors[medalType] : Colors.gray300}
          />
        </View>
      </Card>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={Colors.gray700} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={[styles.categoryIcon, { backgroundColor: `${config.color}15` }]}>
              <Icon size={24} color={config.color} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{config.label} Achievements</Text>
              <Text style={styles.subtitle}>
                {medals.length} of 4 medals earned
              </Text>
            </View>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Your Progress</Text>
            <Text style={styles.summaryText}>
              You've completed {totalCompletions} {
                category === 'habit' ? 'habit goals' : 
                category === 'project' ? 'project goals' :
                category === 'learn' ? 'learn goals' :
                'save goals'
              } in this category.
            </Text>
            <Text style={styles.summarySubtext}>
              Keep going to unlock more achievements and earn XP!
            </Text>
          </Card>

          <View style={styles.achievementsSection}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            {Object.keys(achievementThresholds).map((medalType) =>
              renderAchievement(medalType as keyof typeof achievementThresholds)
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray800,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.gray600,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summaryCard: {
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray800,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 16,
    color: Colors.gray700,
    lineHeight: 22,
    marginBottom: 8,
  },
  summarySubtext: {
    fontSize: 14,
    color: Colors.gray500,
    lineHeight: 20,
  },
  achievementsSection: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray800,
    marginBottom: 16,
  },
  achievementCard: {
    marginBottom: 16,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  medalContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  achievementInfo: {
    flex: 1,
  },
  medalName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray800,
    marginBottom: 4,
  },
  medalDescription: {
    fontSize: 14,
    color: Colors.gray600,
    lineHeight: 20,
    marginBottom: 4,
  },
  xpReward: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  earnedBadge: {
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  earnedText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  progressSection: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: Colors.gray600,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray700,
  },
});