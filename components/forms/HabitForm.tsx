import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';
import { HabitGoal } from '@/types/Goal';

interface HabitFormProps {
  onSubmit: (data: Partial<HabitGoal>) => void;
  onCancel: () => void;
}

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function HabitForm({ onSubmit, onCancel }: HabitFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<boolean[]>(new Array(7).fill(true));

  const toggleDay = (index: number) => {
    const newFrequency = [...frequency];
    newFrequency[index] = !newFrequency[index];
    setFrequency(newFrequency);
  };

  const handleSubmit = () => {
    if (title.trim()) {
      onSubmit({
        title: title.trim(),
        description: description.trim(),
        frequency,
        streak: 0,
        completions: {},
        completedDates: [],
        category: 'habit',
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onCancel}
        >
          <ArrowLeft size={24} color={Colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.title}>Create Habit</Text>
      </View>
      
      <Input
        placeholder="Habit title"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />
      
      <Input
        placeholder="Description (optional)"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
        style={[styles.input, styles.textArea]}
      />
      
      <Text style={styles.sectionTitle}>Frequency</Text>
      <View style={styles.frequencyContainer}>
        {weekdays.map((day, index) => (
          <TouchableOpacity
            key={day}
            style={[
              styles.dayButton,
              frequency[index] && styles.dayButtonActive
            ]}
            onPress={() => toggleDay(index)}
          >
            <Text style={[
              styles.dayText,
              frequency[index] && styles.dayTextActive
            ]}>
              {day}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.buttonContainer}>
        <Button
          title="Cancel"
          onPress={onCancel}
          variant="outline"
          style={styles.cancelButton}
        />
        <Button
          title="Create"
          onPress={handleSubmit}
          disabled={!title.trim()}
          style={styles.submitButton}
        />
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
  input: {
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray800,
    marginBottom: 12,
  },
  frequencyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray600,
  },
  dayTextActive: {
    color: Colors.white,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});