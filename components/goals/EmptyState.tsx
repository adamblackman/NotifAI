import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Target } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';

export function EmptyState() {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Target size={64} color={Colors.gray300} />
      </View>
      <Text style={styles.title}>No goals yet</Text>
      <Text style={styles.description}>
        Start by typing your thoughts above or create a goal manually below
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.gray800,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 22,
  },
});