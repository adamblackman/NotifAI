/*
  # Enhanced Notification System

  1. Database Updates
    - Add contact info to profiles table
    - Add notification_category to scheduled_notifications
    - Update indexes for performance

  2. Security
    - Maintain existing RLS policies
    - Add proper constraints
*/

-- Add contact information to profiles table
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

-- Add notification_category to scheduled_notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_notifications' AND column_name = 'notification_category'
  ) THEN
    ALTER TABLE scheduled_notifications ADD COLUMN notification_category text DEFAULT 'push';
  END IF;
END $$;

-- Add channel column to scheduled_notifications if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_notifications' AND column_name = 'channel'
  ) THEN
    ALTER TABLE scheduled_notifications ADD COLUMN channel text DEFAULT 'push';
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS profiles_phone_number_idx ON profiles (phone_number);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles (email);
CREATE INDEX IF NOT EXISTS scheduled_notifications_category_idx ON scheduled_notifications (notification_category);
CREATE INDEX IF NOT EXISTS scheduled_notifications_channel_idx ON scheduled_notifications (channel);

-- Add constraints for phone number format (international format)
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

-- Add constraint for country code format
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