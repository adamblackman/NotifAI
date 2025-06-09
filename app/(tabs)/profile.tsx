import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { Award, Trophy, Repeat, SquareCheck as CheckSquare, BookOpen, PiggyBank } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/Colors';
import { useProfile } from '@/hooks/useProfile';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';

const medalColors = {
  bronze: Colors.medal.bronze,
  silver: Colors.medal.silver,
  gold: Colors.medal.gold,
  diamond: Colors.medal.diamond,
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

export default function ProfileScreen() {
  const { profile, getLevelProgress, getXPForNextLevel, goalsXPBreakdown, refetch } = useProfile();

  // Refresh profile data when tab is focused to get latest XP from goals
  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  const renderMedalShelf = (category: string, medals: string[]) => (
    <Card key={category} style={styles.medalCard}>
      <Text style={styles.categoryTitle}>{category.charAt(0).toUpperCase() + category.slice(1)}</Text>
      <View style={styles.medalsContainer}>
        {['bronze', 'silver', 'gold', 'diamond'].map((medalType) => {
          const earned = medals.includes(medalType);
          return (
            <View
              key={medalType}
              style={[
                styles.medalContainer,
                { backgroundColor: earned ? `${medalColors[medalType as keyof typeof medalColors]}20` : Colors.gray100 }
              ]}
            >
              <Award
                size={24}
                color={earned ? medalColors[medalType as keyof typeof medalColors] : Colors.gray300}
              />
            </View>
          );
        })}
      </View>
    </Card>
  );

  const renderXPBreakdown = () => (
    <Card style={styles.xpBreakdownCard}>
      <Text style={styles.sectionTitle}>XP Breakdown</Text>
      <View style={styles.xpBreakdownContainer}>
        {Object.entries(categoryConfig).map(([category, config]) => {
          const Icon = config.icon;
          const xp = goalsXPBreakdown[category as keyof typeof goalsXPBreakdown];
          
          if (xp === 0) return null;
          
          return (
            <View key={category} style={styles.xpBreakdownItem}>
              <View style={styles.xpBreakdownLeft}>
                <View style={[styles.xpBreakdownIcon, { backgroundColor: `${config.color}15` }]}>
                  <Icon size={16} color={config.color} />
                </View>
                <Text style={styles.xpBreakdownLabel}>{config.label}</Text>
              </View>
              <Text style={styles.xpBreakdownValue}>{xp.toLocaleString()} XP</Text>
            </View>
          );
        })}
        
        {profile.xp === 0 && (
          <Text style={styles.noXPText}>Complete goals to start earning XP!</Text>
        )}
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>
        
        <Card style={styles.xpCard}>
          <View style={styles.xpHeader}>
            <Trophy size={32} color={Colors.primary} />
            <View style={styles.xpInfo}>
              <Text style={styles.levelText}>Level {profile.level}</Text>
              <Text style={styles.xpText}>{profile.xp.toLocaleString()} XP</Text>
            </View>
          </View>
          
          <View style={styles.progressContainer}>
            <ProgressBar progress={getLevelProgress()} height={12} />
            <Text style={styles.nextLevelText}>
              {getXPForNextLevel().toLocaleString()} XP to next level
            </Text>
          </View>
        </Card>
        
        {renderXPBreakdown()}
        
        <View style={styles.medalsSection}>
          <Text style={styles.sectionTitle}>Medal Collection</Text>
          {Object.entries(profile.medals).map(([category, medals]) =>
            renderMedalShelf(category, medals)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 0,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.gray800,
  },
  xpCard: {
    margin: 20,
  },
  xpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  xpInfo: {
    marginLeft: 16,
    flex: 1,
  },
  levelText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.gray800,
  },
  xpText: {
    fontSize: 16,
    color: Colors.gray600,
    marginTop: 2,
  },
  progressContainer: {
    gap: 8,
  },
  nextLevelText: {
    fontSize: 14,
    color: Colors.gray500,
    textAlign: 'right',
  },
  xpBreakdownCard: {
    margin: 20,
    marginTop: 0,
  },
  xpBreakdownContainer: {
    gap: 12,
  },
  xpBreakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpBreakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  xpBreakdownIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  xpBreakdownLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray700,
  },
  xpBreakdownValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.gray800,
  },
  noXPText: {
    fontSize: 16,
    color: Colors.gray500,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  medalsSection: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.gray800,
    marginBottom: 16,
  },
  medalCard: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray800,
    marginBottom: 12,
  },
  medalsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  medalContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});