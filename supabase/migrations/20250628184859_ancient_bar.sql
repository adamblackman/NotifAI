/*
  # Notification System Refinement

  1. Database Schema Updates
    - Remove email, phone, and enabled_channels from preferences table
    - Ensure profiles table has phone_number, country_code, and email columns
    - Add notification_category to scheduled_notifications table
    - Add channel to scheduled_notifications table
    - Add notification_channels to goals table

  2. Constraints and Indexes
    - Add phone number format constraint
    - Add country code format constraint
    - Create indexes for better performance
*/

-- Remove columns from preferences table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'preferences' AND column_name = 'email'
  ) THEN
    ALTER TABLE preferences DROP COLUMN email;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'preferences' AND column_name = 'phone'
  ) THEN
    ALTER TABLE preferences DROP COLUMN phone;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'preferences' AND column_name = 'enabled_channels'
  ) THEN
    ALTER TABLE preferences DROP COLUMN enabled_channels;
  END IF;
END $$;

-- Ensure profiles table has contact information columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_number text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'country_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN country_code text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email text;
  END IF;
END $$;

-- Ensure scheduled_notifications has required columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_notifications' AND column_name = 'notification_category'
  ) THEN
    ALTER TABLE scheduled_notifications ADD COLUMN notification_category text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_notifications' AND column_name = 'channel'
  ) THEN
    ALTER TABLE scheduled_notifications ADD COLUMN channel text DEFAULT 'push';
  END IF;
END $$;

-- Ensure goals table has notification_channels column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'goals' AND column_name = 'notification_channels'
  ) THEN
    ALTER TABLE goals ADD COLUMN notification_channels text[] DEFAULT ARRAY['push'];
  END IF;
END $$;

-- Add constraints for phone number and country code format
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_phone_number_format'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_phone_number_format 
    CHECK (phone_number IS NULL OR phone_number ~ '^\+[1-9]\d{1,14}$');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_country_code_format'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_country_code_format 
    CHECK (country_code IS NULL OR country_code ~ '^\+[1-9]\d{0,3}$');
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS profiles_phone_number_idx ON profiles (phone_number);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles (email);
CREATE INDEX IF NOT EXISTS goals_notification_channels_idx ON goals USING GIN (notification_channels);
CREATE INDEX IF NOT EXISTS scheduled_notifications_category_idx ON scheduled_notifications (notification_category);
CREATE INDEX IF NOT EXISTS scheduled_notifications_channel_idx ON scheduled_notifications (channel);