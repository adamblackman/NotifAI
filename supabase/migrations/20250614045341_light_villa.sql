/*
  # Add order field to goals table

  1. Changes
    - Add `order` field to goals table for drag-and-drop positioning
    - Set default values for existing goals based on creation date
*/

-- Add order column to goals table
ALTER TABLE goals ADD COLUMN IF NOT EXISTS "order" integer DEFAULT 0;

-- Update existing goals with order based on creation date
UPDATE goals 
SET "order" = row_number() OVER (PARTITION BY user_id ORDER BY created_at) - 1
WHERE "order" = 0;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS goals_user_order_idx ON goals(user_id, "order");