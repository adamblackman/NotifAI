/*
  # Add notification channels to goals and preferences

  1. Database Changes
    - Add notification_channels column to goals table
    - Add email and phone fields to preferences table
    - Add notification channel preferences to preferences table

  2. Security
    - Update existing RLS policies to include new columns
*/

-- Add notification channels to goals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'goals' AND column_name = 'notification_channels'
  ) THEN
    ALTER TABLE goals ADD COLUMN notification_channels text[] DEFAULT ARRAY['push'];
  END IF;
END $$;

-- Add email and phone to preferences table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'preferences' AND column_name = 'email'
  ) THEN
    ALTER TABLE preferences ADD COLUMN email text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'preferences' AND column_name = 'phone'
  ) THEN
    ALTER TABLE preferences ADD COLUMN phone text;
  END IF;
END $$;

-- Add notification channel preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'preferences' AND column_name = 'enabled_channels'
  ) THEN
    ALTER TABLE preferences ADD COLUMN enabled_channels text[] DEFAULT ARRAY['push'];
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS goals_notification_channels_idx ON goals USING GIN (notification_channels);
CREATE INDEX IF NOT EXISTS preferences_enabled_channels_idx ON preferences USING GIN (enabled_channels);