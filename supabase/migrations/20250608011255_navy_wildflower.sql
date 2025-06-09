/*
  # Initial Schema for Goal and Habit Companion App

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `xp` (integer, default 0)
      - `level` (integer, default 1)
      - `medals` (jsonb, stores medal achievements by category)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `goals`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `title` (text)
      - `description` (text)
      - `category` (enum: habit, project, Learn, Save)
      - `data` (jsonb, stores category-specific data)
      - `xp_earned` (integer, default 0)
      - `created_at` (timestamp)
      - `completed_at` (timestamp, nullable)
      - `updated_at` (timestamp)
    
    - `preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `notification_window_start` (integer, default 9)
      - `notification_window_end` (integer, default 21)
      - `notification_days` (boolean array, default all true)
      - `personality` (enum: serious, friendly, motivating, funny)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create custom types
CREATE TYPE goal_category AS ENUM ('habit', 'project', 'learn', 'save');
CREATE TYPE personality_type AS ENUM ('serious', 'friendly', 'motivating', 'funny');

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp integer DEFAULT 0 NOT NULL,
  level integer DEFAULT 1 NOT NULL,
  medals jsonb DEFAULT '{"habit": [], "project": [], "learn": [], "save": []}' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '' NOT NULL,
  category goal_category NOT NULL,
  data jsonb DEFAULT '{}' NOT NULL,
  xp_earned integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create preferences table
CREATE TABLE IF NOT EXISTS preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  notification_window_start integer DEFAULT 9 NOT NULL CHECK (notification_window_start >= 0 AND notification_window_start <= 23),
  notification_window_end integer DEFAULT 21 NOT NULL CHECK (notification_window_end >= 0 AND notification_window_end <= 23),
  notification_days boolean[] DEFAULT ARRAY[true, true, true, true, true, true, true] NOT NULL,
  personality personality_type DEFAULT 'friendly' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create policies for goals
CREATE POLICY "Users can read own goals"
  ON goals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON goals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON goals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON goals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for preferences
CREATE POLICY "Users can read own preferences"
  ON preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS goals_user_id_idx ON goals(user_id);
CREATE INDEX IF NOT EXISTS goals_category_idx ON goals(category);
CREATE INDEX IF NOT EXISTS goals_completed_at_idx ON goals(completed_at);
CREATE INDEX IF NOT EXISTS preferences_user_id_idx ON preferences(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preferences_updated_at
  BEFORE UPDATE ON preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();