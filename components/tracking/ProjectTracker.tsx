import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Circle, CircleCheck as CheckCircle, Plus, GripVertical, SquareCheck as CheckSquare } from 'lucide-react-native';
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
import { ProjectGoal, Task } from '@/types/Goal';

interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'habit' | 'project' | 'learning' | 'saving';
  data: Record<string, any>;
  xpEarned: number;
  createdAt: string;
  completedAt: string | null;
  updatedAt: string;
}

interface ProjectTrackerProps {
  goals: Goal[];
}

export function ProjectTracker({ goals }: ProjectTrackerProps) {
  const [newTaskTitles, setNewTaskTitles] = useState<Record<string, string>>({});
  const { updateGoal } = useGoals();

  const getProjectProgress = (goal: Goal) => {
    const projectGoal = goal as unknown as ProjectGoal;
    const tasks = projectGoal.tasks || [];
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
    const tasks = projectGoal.tasks || [];
    
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      completed: false,
      order: tasks.length,
    };

    const updatedTasks = [...tasks, newTask];

    try {
      await updateGoal(goalId, {
        ...goal,
        tasks: updatedTasks,
      });

      // Clear the input
      setNewTaskTitles(prev => ({
        ...prev,
        [goalId]: '',
      }));
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const removeTask = async (goalId: string, taskId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const projectGoal = goal as unknown as ProjectGoal;
    const tasks = projectGoal.tasks || [];
    const updatedTasks = tasks.filter((task: Task) => task.id !== taskId);

    // Reorder remaining tasks
    const reorderedTasks = updatedTasks.map((task: Task, index: number) => ({
      ...task,
      order: index,
    }));

    try {
      await updateGoal(goalId, {
        ...goal,
        tasks: reorderedTasks,
      });
    } catch (error) {
      console.error('Error removing task:', error);
    }
  };

  const toggleTask = async (goalId: string, taskId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const projectGoal = goal as unknown as ProjectGoal;
    const tasks = projectGoal.tasks || [];
    const updatedTasks = tasks.map((task: Task) => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );

    // Sort tasks: incomplete first, completed last
    const sortedTasks = updatedTasks.sort((a: Task, b: Task) => {
      if (a.completed === b.completed) return a.order - b.order;
      return a.completed ? 1 : -1;
    });

    const xpChange = tasks.find((t: Task) => t.id === taskId)?.completed ? -10 : 10;

    try {
      await updateGoal(goalId, {
        ...goal,
        tasks: sortedTasks,
        xpEarned: goal.xpEarned + xpChange,
      });
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const TaskItem = ({ goal, task }: { goal: Goal; task: Task }) => {
    const scale = useSharedValue(1);
    const xpOpacity = useSharedValue(0);
    const xpTranslateY = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const xpAnimatedStyle = useAnimatedStyle(() => ({
      opacity: xpOpacity.value,
      transform: [{ translateY: xpTranslateY.value }],
    }));

    const handlePress = () => {
      scale.value = withSequence(
        withSpring(0.95, { duration: 100 }),
        withSpring(1, { duration: 100 })
      );

      if (!task.completed) {
        // Show XP animation
        xpOpacity.value = withTiming(1, { duration: 200 });
        xpTranslateY.value = withTiming(-30, { 
          duration: 800, 
          easing: Easing.out(Easing.cubic) 
        }, () => {
          xpOpacity.value = withTiming(0, { duration: 200 });
          xpTranslateY.value = 0;
        });
      }

      runOnJS(toggleTask)(goal.id, task.id);
    };

    return (
      <View style={styles.taskItemContainer}>
        <View style={styles.taskItem}>
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
          <TouchableOpacity 
            style={styles.removeTaskButton}
            onPress={() => removeTask(goal.id, task.id)}
          >
            <GripVertical size={16} color={Colors.gray300} />
          </TouchableOpacity>
        </View>
        
        <Animated.View style={[styles.xpAnimation, xpAnimatedStyle]}>
          <Text style={styles.xpText}>+10 XP</Text>
        </Animated.View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {goals.map((goal) => {
        const projectGoal = goal as unknown as ProjectGoal;
        const progress = getProjectProgress(goal);
        const tasks = projectGoal.tasks || [];

        return (
          <View key={goal.id} style={styles.projectCard}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <CheckSquare size={24} color={Colors.primary} />
                <View style={styles.titleTextContainer}>
                  <Text style={styles.projectTitle}>{goal.title}</Text>
                  {goal.description && (
                    <Text style={styles.projectDescription}>{goal.description}</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Large progress bar */}
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

            {/* Task list */}
            <View style={styles.taskList}>
              <Text style={styles.taskListTitle}>Tasks</Text>
              
              {/* Add new task input */}
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

              {/* Task items */}
              {tasks.map((task: Task) => (
                <TaskItem key={task.id} goal={goal} task={task} />
              ))}

              {tasks.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    No tasks added yet. Add your first task above!
                  </Text>
                </View>
              )}
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{goal.xpEarned}</Text>
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
  header: {
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  titleTextContainer: {
    flex: 1,
    marginLeft: 12,
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
  taskListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray800,
    marginBottom: 16,
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
  xpAnimation: {
    position: 'absolute',
    left: 40,
    top: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  xpText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: 12,
    marginTop: 8,
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
});