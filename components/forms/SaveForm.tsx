import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Plus, X, Calendar, ArrowLeft } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';
import { SaveGoal } from '@/types/Goal';

interface SaveFormProps {
  onSubmit: (data: Partial<SaveGoal>) => void;
  onCancel: () => void;
}

export function SaveForm({ onSubmit, onCancel }: SaveFormProps) {
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [spendingTriggers, setSpendingTriggers] = useState<string[]>([]);
  const [newTrigger, setNewTrigger] = useState('');

  const addSpendingTrigger = () => {
    if (newTrigger.trim()) {
      setSpendingTriggers([...spendingTriggers, newTrigger.trim()]);
      setNewTrigger('');
    }
  };

  const removeTrigger = (index: number) => {
    setSpendingTriggers(spendingTriggers.filter((_, i) => i !== index));
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDeadline(selectedDate);
    }
  };

  const handleSubmit = () => {
    if (title.trim() && targetAmount.trim() && deadline) {
      onSubmit({
        title: title.trim(),
        targetAmount: parseFloat(targetAmount),
        currentAmount: 0,
        deadline,
        spendingTriggers,
        SaveDates: [],
        category: 'save',
      });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onCancel}
        >
          <ArrowLeft size={24} color={Colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.title}>Create Save Goal</Text>
      </View>
      
      <Input
        placeholder="Save goal title"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />
      
      <Input
        placeholder="Target amount ($)"
        value={targetAmount}
        onChangeText={setTargetAmount}
        keyboardType="numeric"
        style={styles.input}
      />
      
      <TouchableOpacity 
        style={styles.dateButton}
        onPress={() => setShowDatePicker(true)}
      >
        <Calendar size={20} color={Colors.gray600} />
        <Text style={styles.dateButtonText}>
          {deadline ? deadline.toDateString() : 'Set deadline'}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={deadline || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
      
      <Text style={styles.sectionTitle}>Spending Triggers to Avoid (Optional)</Text>
      
      <View style={styles.addTriggerContainer}>
        <Input
          placeholder="Add spending trigger..."
          value={newTrigger}
          onChangeText={setNewTrigger}
          style={styles.triggerInput}
          onSubmitEditing={addSpendingTrigger}
        />
        <TouchableOpacity style={styles.addButton} onPress={addSpendingTrigger}>
          <Plus size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>
      
      {spendingTriggers.map((trigger, index) => (
        <View key={index} style={styles.triggerItem}>
          <Text style={styles.triggerText}>{trigger}</Text>
          <TouchableOpacity onPress={() => removeTrigger(index)}>
            <X size={20} color={Colors.gray400} />
          </TouchableOpacity>
        </View>
      ))}
      
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
          disabled={!title.trim() || !targetAmount.trim() || !deadline}
          style={styles.submitButton}
        />
      </View>
    </ScrollView>
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
  },
  dateButtonText: {
    fontSize: 16,
    color: Colors.gray600,
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray800,
    marginBottom: 12,
  },
  addTriggerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  triggerInput: {
    flex: 1,
    marginRight: 12,
    marginBottom: 0,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: Colors.gray50,
    borderRadius: 8,
    marginBottom: 8,
  },
  triggerText: {
    fontSize: 16,
    color: Colors.gray800,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});