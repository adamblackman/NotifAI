import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Plus, X, GripVertical, ArrowLeft } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';
import { LearnGoal, CurriculumItem } from '@/types/Goal';

interface LearnFormProps {
  onSubmit: (data: Partial<LearnGoal>) => void;
  onCancel: () => void;
}

export function LearnForm({ onSubmit, onCancel }: LearnFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [curriculumItems, setCurriculumItems] = useState<CurriculumItem[]>([]);
  const [newItemTitle, setNewItemTitle] = useState('');

  const addCurriculumItem = () => {
    if (newItemTitle.trim()) {
      const newItem: CurriculumItem = {
        id: Date.now().toString(),
        title: newItemTitle.trim(),
        completed: false,
        order: curriculumItems.length,
      };
      setCurriculumItems([...curriculumItems, newItem]);
      setNewItemTitle('');
    }
  };

  const removeItem = (id: string) => {
    setCurriculumItems(curriculumItems.filter(item => item.id !== id));
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    const newItems = [...curriculumItems];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);
    
    // Update order
    const reorderedItems = newItems.map((item, index) => ({
      ...item,
      order: index,
    }));
    setCurriculumItems(reorderedItems);
  };

  const handleSubmit = () => {
    if (title.trim()) {
      onSubmit({
        title: title.trim(),
        description: description.trim(),
        curriculumItems,
        progress: 0,
        category: 'learn',
      });
    }
  };

  const renderItem = (item: CurriculumItem, index: number) => (
    <View key={item.id} style={styles.curriculumItem}>
      <TouchableOpacity
        onPress={() => index > 0 && moveItem(index, index - 1)}
        disabled={index === 0}
        style={[styles.moveButton, index === 0 && styles.moveButtonDisabled]}
      >
        <GripVertical size={20} color={index === 0 ? Colors.gray300 : Colors.gray400} />
      </TouchableOpacity>
      <Text style={styles.itemTitle}>{item.title}</Text>
      <TouchableOpacity onPress={() => removeItem(item.id)}>
        <X size={20} color={Colors.gray400} />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onCancel}
        >
          <ArrowLeft size={24} color={Colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.title}>Create Learn Goal</Text>
      </View>
      
      <Input
        placeholder="Learn goal title"
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
      
      <Text style={styles.sectionTitle}>Curriculum</Text>
      
      <View style={styles.addItemContainer}>
        <Input
          placeholder="Add curriculum item..."
          value={newItemTitle}
          onChangeText={setNewItemTitle}
          style={styles.itemInput}
          onSubmitEditing={addCurriculumItem}
        />
        <TouchableOpacity style={styles.addButton} onPress={addCurriculumItem}>
          <Plus size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>
      
      {curriculumItems.map((item, index) => renderItem(item, index))}
      
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
  addItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemInput: {
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
  curriculumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.gray50,
    borderRadius: 8,
    marginBottom: 8,
  },
  moveButton: {
    padding: 4,
    marginRight: 8,
  },
  moveButtonDisabled: {
    opacity: 0.3,
  },
  itemTitle: {
    flex: 1,
    fontSize: 16,
    color: Colors.gray800,
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