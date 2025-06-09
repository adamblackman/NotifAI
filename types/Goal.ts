export type GoalCategory = 'habit' | 'project' | 'learning' | 'saving';

export interface BaseGoal {
  id: string;
  title: string;
  description: string;
  category: GoalCategory;
  createdAt: Date;
  completedAt?: Date;
  xpEarned: number;
}

export interface HabitGoal extends BaseGoal {
  category: 'habit';
  frequency?: boolean[]; // 7 days, true = active day
  streak?: number;
  completions?: { [date: string]: boolean };
  completedDates?: string[]; // Array of completed dates
}

export interface ProjectGoal extends BaseGoal {
  category: 'project';
  dueDate?: Date;
  tasks?: Task[];
  progress?: number; // 0-100
}

export interface LearningGoal extends BaseGoal {
  category: 'learning';
  curriculumItems?: CurriculumItem[];
  progress?: number; // 0-100
  targetHours?: number;
  completedHours?: number;
  sessions?: any[];
}

export interface SavingGoal extends BaseGoal {
  category: 'saving';
  targetAmount?: number;
  currentAmount?: number;
  deadline?: Date;
  targetDate?: Date; // Alternative name for deadline
  spendingTriggers?: string[];
  contributions?: any[];
  savingDates?: string[]; // Array of dates when saving was done
}

export type Goal = HabitGoal | ProjectGoal | LearningGoal | SavingGoal;

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  order: number;
}

export interface CurriculumItem {
  id: string;
  title: string;
  completed: boolean;
  sessionCount?: number;
  dueDate?: Date;
  order: number;
}

export interface UserProfile {
  id: string;
  xp: number;
  level: number;
  medals: {
    habit: MedalType[];
    project: MedalType[];
    learning: MedalType[];
    saving: MedalType[];
  };
}

export type MedalType = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface Preferences {
  notificationWindow: {
    start: number; // hour 0-23
    end: number; // hour 0-23
  };
  notificationDays: boolean[]; // 7 days, true = active day
  personality: 'serious' | 'friendly' | 'motivating' | 'funny';
}