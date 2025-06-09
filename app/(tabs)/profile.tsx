import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { Award, Trophy } from 'lucide-react-native';
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

export default function ProfileScreen() {
  const { profile, getLevelProgress, getXPForNextLevel } = useProfile();

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