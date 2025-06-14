/*
  # Add order column to goals table

  1. Changes
    - Add order column to goals table with default value 0
    - Update existing goals with proper order based on creation date
    - Create index for better performance on user_id and order

  2. Implementation
    - Use WITH clause and subquery to avoid window function in UPDATE
    - Maintain existing goal ordering based on creation date
*/

-- Add order column to goals table
ALTER TABLE goals ADD COLUMN IF NOT EXISTS "order" integer DEFAULT 0;

-- Update existing goals with order based on creation date using a subquery approach
WITH ordered_goals AS (
  SELECT 
    id,
    row_number() OVER (PARTITION BY user_id ORDER BY created_at) - 1 as new_order
  FROM goals 
  WHERE "order" = 0
)
UPDATE goals 
SET "order" = ordered_goals.new_order
FROM ordered_goals
WHERE goals.id = ordered_goals.id;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS goals_user_order_idx ON goals(user_id, "order");