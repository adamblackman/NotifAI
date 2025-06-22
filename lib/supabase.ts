import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Supabase Organization Slug for Bolt Hackathon Challenge
export const SUPABASE_ORG_SLUG = "lvdmjsshlrxpzjsjdnji";

const supabaseUrl = "https://uhnvncqogcfgkdhlvmzq.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnZuY3FvZ2NmZ2tkaGx2bXpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4MjE3NDAsImV4cCI6MjA2NDM5Nzc0MH0.rYRstoYB-yfg9N8SxmZPaSGQg9lA4iCkGEF6raoQ2CQ";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

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
          category: "habit" | "project" | "learn" | "save";
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
          category: "habit" | "project" | "learn" | "save";
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
          category?: "habit" | "project" | "learn" | "save";
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
          personality: "serious" | "friendly" | "motivating" | "funny";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          notification_window_start?: number;
          notification_window_end?: number;
          notification_days?: boolean[];
          personality?: "serious" | "friendly" | "motivating" | "funny";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          notification_window_start?: number;
          notification_window_end?: number;
          notification_days?: boolean[];
          personality?: "serious" | "friendly" | "motivating" | "funny";
          updated_at?: string;
        };
      };
    };
  };
}
