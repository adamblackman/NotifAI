/*
  # Add Notification System Tables

  1. New Tables
    - `device_tokens`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `token` (text, unique push token)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `scheduled_notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `goal_id` (uuid, references goals, nullable)
      - `message` (text, notification content)
      - `scheduled_at` (timestamp, when to send)
      - `sent_at` (timestamp, when actually sent)
      - `status` (text, pending/sent/failed)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
*/

-- Create device_tokens table
CREATE TABLE IF NOT EXISTS device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create scheduled_notifications table
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  goal_id uuid REFERENCES goals(id) ON DELETE CASCADE,
  message text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  status text DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for device_tokens
CREATE POLICY "Users can read own device tokens"
  ON device_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own device tokens"
  ON device_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own device tokens"
  ON device_tokens
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own device tokens"
  ON device_tokens
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for scheduled_notifications
CREATE POLICY "Users can read own scheduled notifications"
  ON scheduled_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scheduled notifications"
  ON scheduled_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scheduled notifications"
  ON scheduled_notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheduled notifications"
  ON scheduled_notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS device_tokens_user_id_idx ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS scheduled_notifications_user_id_idx ON scheduled_notifications(user_id);
CREATE INDEX IF NOT EXISTS scheduled_notifications_scheduled_at_idx ON scheduled_notifications(scheduled_at);
CREATE INDEX IF NOT EXISTS scheduled_notifications_status_idx ON scheduled_notifications(status);
CREATE INDEX IF NOT EXISTS scheduled_notifications_goal_id_idx ON scheduled_notifications(goal_id);

-- Create triggers for updated_at
CREATE TRIGGER update_device_tokens_updated_at
  BEFORE UPDATE ON device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_notifications_updated_at
  BEFORE UPDATE ON scheduled_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();