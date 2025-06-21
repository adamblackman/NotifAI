export type GoalCategory = "habit" | "project" | "learn" | "save";

export interface BaseGoal {
  id: string;
  title: string;
  description: string;
  category: GoalCategory;
  createdAt: Date;
  completedAt?: Date;
  xpEarned: number;
  order?: number;
}

export interface HabitGoal extends BaseGoal {
  category: "habit";
  frequency?: boolean[]; // 7 days, true = active day
  streak?: number;
  completions?: { [date: string]: boolean };
  completedDates?: string[]; // Array of completed dates
  targetDays?: number; // Target number of days to complete the habit
}

export interface ProjectGoal extends BaseGoal {
  category: "project";
  dueDate?: Date;
  tasks?: Task[];
  progress?: number; // 0-100
}

export interface LearnGoal extends BaseGoal {
  category: "learn";
  curriculumItems?: CurriculumItem[];
  progress?: number; // 0-100
  targetHours?: number;
  completedHours?: number;
  sessions?: any[];
}

export interface SaveGoal extends BaseGoal {
  category: "save";
  targetAmount?: number;
  currentAmount?: number;
  deadline?: Date;
  targetDate?: Date; // Alternative name for deadline
  spendingTriggers?: string[];
  contributions?: any[];
  SaveDates?: string[]; // Array of dates when Save was done
}

export type Goal = HabitGoal | ProjectGoal | LearnGoal | SaveGoal;

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
    learn: MedalType[];
    save: MedalType[];
  };
}

export type MedalType = "bronze" | "silver" | "gold" | "diamond";

export interface Preferences {
  notificationWindow: {
    start: number; // hour 0-23
    end: number; // hour 0-23
  };
  notificationDays: boolean[]; // 7 days, true = active day
  personality: "serious" | "friendly" | "motivating" | "funny";
}
