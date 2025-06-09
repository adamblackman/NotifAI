import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Plus, X, GripVertical, Calendar, ArrowLeft } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';
import { ProjectGoal, Task } from '@/types/Goal';

interface ProjectFormProps {
  onSubmit: (data: Partial<ProjectGoal>) => void;
  onCancel: () => void;
}

export function ProjectForm({ onSubmit, onCancel }: ProjectFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const addTask = () => {
    if (newTaskTitle.trim()) {
      const newTask: Task = {
        id: Date.now().toString(),
        title: newTaskTitle.trim(),
        completed: false,
        order: tasks.length,
      };
      setTasks([...tasks, newTask]);
      setNewTaskTitle('');
    }
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const moveTask = (fromIndex: number, toIndex: number) => {
    const newTasks = [...tasks];
    const [movedTask] = newTasks.splice(fromIndex, 1);
    newTasks.splice(toIndex, 0, movedTask);
    
    // Update order
    const reorderedTasks = newTasks.map((task, index) => ({
      ...task,
      order: index,
    }));
    setTasks(reorderedTasks);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  const handleSubmit = () => {
    if (title.trim()) {
      onSubmit({
        title: title.trim(),
        description: description.trim(),
        dueDate,
        tasks,
        progress: 0,
        category: 'project',
      });
    }
  };

  const renderTask = (task: Task, index: number) => (
    <View key={task.id} style={styles.taskItem}>
      <TouchableOpacity
        onPress={() => index > 0 && moveTask(index, index - 1)}
        disabled={index === 0}
        style={[styles.moveButton, index === 0 && styles.moveButtonDisabled]}
      >
        <GripVertical size={20} color={index === 0 ? Colors.gray300 : Colors.gray400} />
      </TouchableOpacity>
      <Text style={styles.taskTitle}>{task.title}</Text>
      <TouchableOpacity onPress={() => removeTask(task.id)}>
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
        <Text style={styles.title}>Create Project</Text>
      </View>
      
      <Input
        placeholder="Project title"
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
      
      <TouchableOpacity 
        style={styles.dateButton}
        onPress={() => setShowDatePicker(true)}
      >
        <Calendar size={20} color={Colors.gray600} />
        <Text style={styles.dateButtonText}>
          {dueDate ? dueDate.toDateString() : 'Add due date (optional)'}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={dueDate || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
      
      <Text style={styles.sectionTitle}>Tasks</Text>
      
      <View style={styles.addTaskContainer}>
        <Input
          placeholder="Add a task..."
          value={newTaskTitle}
          onChangeText={setNewTaskTitle}
          style={styles.taskInput}
          onSubmitEditing={addTask}
        />
        <TouchableOpacity style={styles.addButton} onPress={addTask}>
          <Plus size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>
      
      {tasks.map((task, index) => renderTask(task, index))}
      
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
  addTaskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  taskInput: {
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
  taskItem: {
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
  taskTitle: {
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