import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Circle, CircleCheck as CheckCircle, Plus, Trash2, SquareCheck as CheckSquare, ChevronUp, ChevronDown, Edit3, Check } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withSequence,
  runOnJS,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { useGoals } from '@/hooks/useGoals';
import { useProfile } from '@/hooks/useProfile';
import { ProjectGoal, Task, Goal } from '@/types/Goal';

interface ProjectTrackerProps {
  goals: ProjectGoal[];
}

export function ProjectTracker({ goals }: ProjectTrackerProps) {
  const [newTaskTitles, setNewTaskTitles] = useState<Record<string, string>>({});
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, Task[]>>({});
  const [pendingXPUpdates, setPendingXPUpdates] = useState<Record<string, number>>({});
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [editedTitles, setEditedTitles] = useState<Record<string, string>>({});
  const [editedDescriptions, setEditedDescriptions] = useState<Record<string, string>>({});
  const { updateGoal, deleteGoal, checkAndCompleteGoal, isGoalCompleted, getGoalsSortedByCompletion } = useGoals();
  const { syncProfileXPToGoals, awardMedalForGoalCompletion } = useProfile();

  const toggleEditMode = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const isCurrentlyEditing = editMode[goalId];
    
    if (isCurrentlyEditing) {
      // Save changes
      saveGoalEdits(goalId);
    } else {
      // Enter edit mode - populate current values
      setEditedTitles(prev => ({
        ...prev,
        [goalId]: goal.title
      }));
      setEditedDescriptions(prev => ({
        ...prev,
        [goalId]: goal.description || ''
      }));
    }
    
    setEditMode(prev => ({
      ...prev,
      [goalId]: !isCurrentlyEditing
    }));
  };

  const saveGoalEdits = async (goalId: string) => {
    const newTitle = editedTitles[goalId];
    const newDescription = editedDescriptions[goalId];
    
    if (!newTitle?.trim()) return;

    try {
      await updateGoal(goalId, {
        title: newTitle.trim(),
        description: newDescription?.trim() || undefined
      });
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  useEffect(() => {
    Object.keys(pendingUpdates).forEach(goalId => {
      const goal = goals.find(g => g.id === goalId);
      const pendingTasks = pendingUpdates[goalId];
      
      if (goal && pendingTasks && pendingOperations.size === 0) {
        const projectGoal = goal as unknown as ProjectGoal;
        const currentTasks = projectGoal.tasks || [];
        
        const tasksMatch = pendingTasks.length === currentTasks.length && 
          pendingTasks.every(pendingTask => 
            currentTasks.some(currentTask => 
              currentTask.id === pendingTask.id && 
              currentTask.title === pendingTask.title &&
              currentTask.completed === pendingTask.completed
            )
          );
        
        if (tasksMatch) {
          setPendingUpdates(prev => {
            const updated = { ...prev };
            delete updated[goalId];
            return updated;
          });
        }
      }
    });
  }, [goals, pendingUpdates, pendingOperations]);

  const getProjectProgress = (goal: Goal) => {
    const projectGoal = goal as unknown as ProjectGoal;
    const tasks = pendingUpdates[goal.id] || projectGoal.tasks || [];
    const completedTasks = tasks.filter((task: Task) => task.completed).length;
    return {
      completed: completedTasks,
      total: tasks.length,
      percentage: tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0,
    };
  };

  const addTask = async (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    const newTaskTitle = newTaskTitles[goalId];
    
    if (!goal || !newTaskTitle?.trim()) return;

    const projectGoal = goal as unknown as ProjectGoal;
    const baseTasks = pendingUpdates[goalId] || projectGoal.tasks || [];
    
    const firstCompletedIndex = baseTasks.findIndex(task => task.completed);
    const insertIndex = firstCompletedIndex === -1 ? baseTasks.length : firstCompletedIndex;
    
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      completed: false,
      order: insertIndex,
    };

    const updatedTasks = [...baseTasks];
    updatedTasks.splice(insertIndex, 0, newTask);
    
    const reorderedTasks = updatedTasks.map((task, index) => ({
      ...task,
      order: index,
    }));
    
    const operationId = `add-${goalId}-${Date.now()}`;

    setPendingOperations(prev => new Set([...prev, operationId]));
    setPendingUpdates(prev => ({
      ...prev,
      [goalId]: reorderedTasks
    }));

    setNewTaskTitles(prev => ({
      ...prev,
      [goalId]: '',
    }));

    try {
      await updateGoal(goalId, {
        ...goal,
        tasks: reorderedTasks,
      });
      
      setPendingOperations(prev => {
        const updated = new Set(prev);
        updated.delete(operationId);
        return updated;
      });

      // Clear pending XP updates when operation completes
      if (pendingXPUpdates[goalId] !== undefined) {
        setPendingXPUpdates(prev => {
          const updated = { ...prev };
          delete updated[goalId];
          return updated;
        });
      }

    } catch (error) {
      console.error('Error adding task:', error);
      setPendingOperations(prev => {
        const updated = new Set(prev);
        updated.delete(operationId);
        return updated;
      });
      setPendingUpdates(prev => {
        const updated = { ...prev };
        delete updated[goalId];
        return updated;
      });
      setNewTaskTitles(prev => ({
        ...prev,
        [goalId]: newTaskTitle,
      }));
    }
  };

  const removeTask = async (goalId: string, taskId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const projectGoal = goal as unknown as ProjectGoal;
    const baseTasks = pendingUpdates[goalId] || projectGoal.tasks || [];
    const updatedTasks = baseTasks.filter((task: Task) => task.id !== taskId);

    const reorderedTasks = updatedTasks.map((task: Task, index: number) => ({
      ...task,
      order: index,
    }));

    const operationId = `remove-${goalId}-${taskId}-${Date.now()}`;

    setPendingOperations(prev => new Set([...prev, operationId]));
    setPendingUpdates(prev => ({
      ...prev,
      [goalId]: reorderedTasks
    }));

    try {
      await updateGoal(goalId, {
        ...goal,
        tasks: reorderedTasks,
      });
      
      setPendingOperations(prev => {
        const updated = new Set(prev);
        updated.delete(operationId);
        return updated;
      });
    } catch (error) {
      console.error('Error removing task:', error);
      setPendingOperations(prev => {
        const updated = new Set(prev);
        updated.delete(operationId);
        return updated;
      });
      setPendingUpdates(prev => {
        const updated = { ...prev };
        delete updated[goalId];
        return updated;
      });
    }
  };

  const toggleTask = async (goalId: string, taskId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const projectGoal = goal as unknown as ProjectGoal;
    const baseTasks = pendingUpdates[goalId] || projectGoal.tasks || [];
    const updatedTasks = baseTasks.map((task: Task) => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );

    const sortedTasks = updatedTasks.sort((a: Task, b: Task) => {
      if (a.completed === b.completed) return a.order - b.order;
      return a.completed ? 1 : -1;
    });

    const operationId = `toggle-${goalId}-${taskId}-${Date.now()}`;

    setPendingOperations(prev => new Set([...prev, operationId]));
    setPendingUpdates(prev => ({
      ...prev,
      [goalId]: sortedTasks
    }));

    // Calculate total XP as 5 × completed tasks
    const completedCount = sortedTasks.filter((task: Task) => task.completed).length;
    const newXpEarned = completedCount * 5;
    const xpChange = newXpEarned - goal.xpEarned;

    // Track XP changes optimistically
    const currentPendingXP = pendingXPUpdates[goalId] || 0;
    setPendingXPUpdates(prev => ({
      ...prev,
      [goalId]: currentPendingXP + xpChange
    }));

    try {
      const updatedGoal = await updateGoal(goalId, {
        ...goal,
        tasks: sortedTasks,
        xpEarned: newXpEarned,
      });
      
      // Check if goal should be completed and award medals
      const wasCompleted = await checkAndCompleteGoal(updatedGoal);
      if (wasCompleted) {
        await awardMedalForGoalCompletion('project');
      }
      
      // Sync profile XP to match the sum of all goal XP
      await syncProfileXPToGoals();
      
      setPendingOperations(prev => {
        const updated = new Set(prev);
        updated.delete(operationId);
        return updated;
      });

      // Clear pending XP updates when operation completes
      if (pendingXPUpdates[goalId] !== undefined) {
        setPendingXPUpdates(prev => {
          const updated = { ...prev };
          delete updated[goalId];
          return updated;
        });
      }
    } catch (error) {
      console.error('Error updating task:', error);
      setPendingOperations(prev => {
        const updated = new Set(prev);
        updated.delete(operationId);
        return updated;
      });
      setPendingUpdates(prev => {
        const updated = { ...prev };
        delete updated[goalId];
        return updated;
      });
      // Revert XP changes on error
      setPendingXPUpdates(prev => ({
        ...prev,
        [goalId]: currentPendingXP
      }));
    }
  };

  const handleDeleteTask = (goalId: string, taskId: string, taskTitle: string) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${taskTitle}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeTask(goalId, taskId),
        },
      ],
    );
  };

  const reorderTasks = async (goalId: string, fromIndex: number, toIndex: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const projectGoal = goal as unknown as ProjectGoal;
    const baseTasks = pendingUpdates[goalId] || projectGoal.tasks || [];
    
    const incompleteTasks = baseTasks.filter(task => !task.completed);
    const completedTasks = baseTasks.filter(task => task.completed);
    
    if (fromIndex >= incompleteTasks.length || toIndex >= incompleteTasks.length) {
      return;
    }
    
    const reorderedIncompleteTasks = [...incompleteTasks];
    const [movedTask] = reorderedIncompleteTasks.splice(fromIndex, 1);
    reorderedIncompleteTasks.splice(toIndex, 0, movedTask);
    
    const allTasks = [...reorderedIncompleteTasks, ...completedTasks];
    
    const reorderedTasks = allTasks.map((task, index) => ({
      ...task,
      order: index,
    }));

    const operationId = `reorder-${goalId}-${Date.now()}`;

    setPendingOperations(prev => new Set([...prev, operationId]));
    setPendingUpdates(prev => ({
      ...prev,
      [goalId]: reorderedTasks
    }));

    try {
      await updateGoal(goalId, {
        ...goal,
        tasks: reorderedTasks,
      });
      
      setPendingOperations(prev => {
        const updated = new Set(prev);
        updated.delete(operationId);
        return updated;
      });
    } catch (error) {
      console.error('Error reordering tasks:', error);
      setPendingOperations(prev => {
        const updated = new Set(prev);
        updated.delete(operationId);
        return updated;
      });
      setPendingUpdates(prev => {
        const updated = { ...prev };
        delete updated[goalId];
        return updated;
      });
    }
  };

  const TaskItem = ({ goal, task, index, onReorder }: { 
    goal: Goal; 
    task: Task; 
    index: number;
    onReorder: (fromIndex: number, toIndex: number) => void;
  }) => {
    const scale = useSharedValue(1);
    
    const projectGoal = goal as unknown as ProjectGoal;
    const allTasks = pendingUpdates[goal.id] || projectGoal.tasks || [];
    const incompleteTasks = allTasks.filter(t => !t.completed);
    const incompleteTaskIndex = incompleteTasks.findIndex(t => t.id === task.id);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const handlePress = () => {
      scale.value = withSequence(
        withSpring(0.95, { duration: 100 }),
        withSpring(1, { duration: 100 })
      );

      runOnJS(toggleTask)(goal.id, task.id);
    };

    return (
      <View style={styles.taskItemContainer}>
        <View style={styles.taskItem}>
          <View style={styles.reorderButtons}>
            {!task.completed && incompleteTaskIndex > 0 && (
              <TouchableOpacity 
                style={styles.reorderButton}
                onPress={() => onReorder(incompleteTaskIndex, incompleteTaskIndex - 1)}
              >
                <ChevronUp size={14} color={Colors.gray500} />
              </TouchableOpacity>
            )}
            {!task.completed && incompleteTaskIndex < incompleteTasks.length - 1 && incompleteTaskIndex >= 0 && (
              <TouchableOpacity 
                style={styles.reorderButton}
                onPress={() => onReorder(incompleteTaskIndex, incompleteTaskIndex + 1)}
              >
                <ChevronDown size={14} color={Colors.gray500} />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity onPress={handlePress} style={styles.taskCheckboxContainer}>
            <Animated.View style={[styles.taskCheckbox, animatedStyle]}>
              {task.completed ? (
                <CheckCircle size={24} color={Colors.primary} />
              ) : (
                <Circle size={24} color={Colors.gray400} />
              )}
            </Animated.View>
          </TouchableOpacity>
          
          <Text style={[
            styles.taskText,
            task.completed && styles.completedTaskText,
          ]}>
            {task.title}
          </Text>
          
          {!task.completed && (
            <TouchableOpacity 
              style={styles.removeTaskButton}
              onPress={() => handleDeleteTask(goal.id, task.id, task.title)}
            >
              <Trash2 size={16} color={Colors.gray400} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Use the goals passed as props (already filtered by the parent component)
  const sortedGoals = goals;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {sortedGoals.map((goal) => {
          const projectGoal = goal as unknown as ProjectGoal;
          const progress = getProjectProgress(goal);
          const tasks = pendingUpdates[goal.id] || projectGoal.tasks || [];
          const completed = isGoalCompleted(goal);

          return (
            <View key={goal.id} style={[styles.projectCard, completed && styles.completedCard]}>
              <View style={styles.cardHeader}>
                <View style={styles.titleContainer}>
                  <View style={styles.titleTextContainer}>
                    {editMode[goal.id] ? (
                      <>
                        <TextInput
                          style={[styles.titleInput, completed && styles.completedTitle]}
                          value={editedTitles[goal.id] || ''}
                          onChangeText={(text) => setEditedTitles(prev => ({
                            ...prev,
                            [goal.id]: text
                          }))}
                          placeholder="Project title"
                          multiline
                        />
                        <TextInput
                          style={[styles.descriptionInput, completed && styles.completedDescription]}
                          value={editedDescriptions[goal.id] || ''}
                          onChangeText={(text) => setEditedDescriptions(prev => ({
                            ...prev,
                            [goal.id]: text
                          }))}
                          placeholder="Project description (optional)"
                          multiline
                        />
                      </>
                    ) : (
                      <>
                        <Text style={[styles.projectTitle, completed && styles.completedTitle]}>
                          {editedTitles[goal.id] || goal.title}
                        </Text>
                        {(editedDescriptions[goal.id] || goal.description) && (
                          <Text style={[styles.projectDescription, completed && styles.completedDescription]}>
                            {editedDescriptions[goal.id] || goal.description}
                          </Text>
                        )}
                      </>
                    )}
                  </View>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => toggleEditMode(goal.id)}
                  >
                    {editMode[goal.id] ? (
                      <Check size={20} color={Colors.primary} />
                    ) : (
                      <Edit3 size={20} color={Colors.gray600} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Project Progress</Text>
                  <Text style={styles.progressText}>
                    {progress.completed} of {progress.total} tasks completed
                  </Text>
                </View>
                
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBar}>
                    <Animated.View 
                      style={[
                        styles.progressFill,
                        { width: `${progress.percentage}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.percentageText}>
                    {Math.round(progress.percentage)}%
                  </Text>
                </View>
              </View>

              <View style={styles.taskList}>              
                <View style={styles.addTaskContainer}>
                  <TextInput
                    style={styles.addTaskInput}
                    placeholder="Add new task..."
                    value={newTaskTitles[goal.id] || ''}
                    onChangeText={(text) => setNewTaskTitles(prev => ({
                      ...prev,
                      [goal.id]: text,
                    }))}
                    onSubmitEditing={() => addTask(goal.id)}
                  />
                  <TouchableOpacity 
                    style={styles.addButton} 
                    onPress={() => addTask(goal.id)}
                  >
                    <Plus size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>

                {tasks.map((task: Task, index: number) => (
                  <TaskItem 
                    key={task.id} 
                    goal={goal} 
                    task={task} 
                    index={index}
                    onReorder={(fromIndex, toIndex) => reorderTasks(goal.id, fromIndex, toIndex)}
                  />
                ))}

                {tasks.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      No tasks added yet. Add your first task above!
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {goal.xpEarned + (pendingXPUpdates[goal.id] || 0)}
                  </Text>
                  <Text style={styles.statLabel}>XP Earned</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{progress.completed}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{progress.total - progress.completed}</Text>
                  <Text style={styles.statLabel}>Remaining</Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  projectCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: {
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  titleTextContainer: {
    flex: 1,
  },
  projectTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: 4,
  },
  projectDescription: {
    fontSize: 14,
    color: Colors.gray600,
    lineHeight: 20,
  },
  progressSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: Colors.gray50,
    borderRadius: 12,
  },
  progressHeader: {
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray700,
    marginBottom: 4,
  },
  progressText: {
    fontSize: 12,
    color: Colors.gray500,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 12,
    backgroundColor: Colors.gray200,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    minWidth: 40,
  },
  taskList: {
    marginBottom: 20,
  },
  addTaskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  addTaskInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: Colors.white,
    marginRight: 12,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  taskItemContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  reorderButtons: {
    flexDirection: 'column',
    justifyContent: 'center',
    width: 24,
    marginRight: 8,
  },
  reorderButton: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCheckboxContainer: {
    marginRight: 12,
  },
  taskCheckbox: {
    // No additional styles needed, just for animation
  },
  taskText: {
    flex: 1,
    fontSize: 16,
    color: Colors.gray800,
    lineHeight: 22,
  },
  completedTaskText: {
    textDecorationLine: 'line-through',
    color: Colors.gray500,
  },
  removeTaskButton: {
    padding: 8,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.gray500,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.gray500,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  completedCard: {
    opacity: 0.7,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: Colors.gray500,
  },
  completedDescription: {
    textDecorationLine: 'line-through',
    color: Colors.gray400,
  },
  editButton: {
    padding: 8,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: Colors.white,
  },
  descriptionInput: {
    fontSize: 14,
    color: Colors.gray600,
    lineHeight: 20,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: Colors.white,
    minHeight: 24,
  },
});