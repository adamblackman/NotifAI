import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          xp: number;
          level: number;
          medals: Record<string, string[]>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          xp?: number;
          level?: number;
          medals?: Record<string, string[]>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          xp?: number;
          level?: number;
          medals?: Record<string, string[]>;
          updated_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          category: 'habit' | 'project' | 'learning' | 'saving';
          data: Record<string, any>;
          xp_earned: number;
          created_at: string;
          completed_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string;
          category: 'habit' | 'project' | 'learning' | 'saving';
          data?: Record<string, any>;
          xp_earned?: number;
          created_at?: string;
          completed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          category?: 'habit' | 'project' | 'learning' | 'saving';
          data?: Record<string, any>;
          xp_earned?: number;
          completed_at?: string | null;
          updated_at?: string;
        };
      };
      preferences: {
        Row: {
          id: string;
          user_id: string;
          notification_window_start: number;
          notification_window_end: number;
          notification_days: boolean[];
          personality: 'serious' | 'friendly' | 'motivating' | 'funny';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          notification_window_start?: number;
          notification_window_end?: number;
          notification_days?: boolean[];
          personality?: 'serious' | 'friendly' | 'motivating' | 'funny';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          notification_window_start?: number;
          notification_window_end?: number;
          notification_days?: boolean[];
          personality?: 'serious' | 'friendly' | 'motivating' | 'funny';
          updated_at?: string;
        };
      };
    };
  };
}