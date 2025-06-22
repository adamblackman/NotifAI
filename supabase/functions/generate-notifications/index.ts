import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    console.log("Starting notification generation...");

    // Get all active users with their preferences
    const { data: users, error: usersError } = await supabaseClient
      .from("profiles")
      .select(`
        id,
        preferences!inner(
          notification_window_start,
          notification_window_end,
          notification_days,
          personality,
          timezone
        )
      `);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    console.log(`Processing ${users.length} users...`);

    for (const user of users) {
      try {
        await processUserNotifications(supabaseClient, user);
      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error);
        // Continue with other users even if one fails
      }
    }

    return new Response(
      JSON.stringify({ success: true, processedUsers: users.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function processUserNotifications(supabaseClient: any, user: any) {
  const preferences = user.preferences;
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const mondayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Monday = 0 index

  // Check if notifications are enabled for today
  if (!preferences.notification_days[mondayIndex]) {
    console.log(`Notifications disabled for user ${user.id} on day ${dayOfWeek}`);
    return;
  }

  // Get user's active goals
  const { data: goals, error: goalsError } = await supabaseClient
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .is("completed_at", null);

  if (goalsError) {
    console.error(`Error fetching goals for user ${user.id}:`, goalsError);
    return;
  }

  if (!goals || goals.length === 0) {
    console.log(`No active goals for user ${user.id}`);
    return;
  }

  // Get recent notifications for this user (past week)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: recentNotifications, error: notificationsError } = await supabaseClient
    .from("scheduled_notifications")
    .select("goal_id, scheduled_at, message")
    .eq("user_id", user.id)
    .gte("scheduled_at", weekAgo.toISOString());

  if (notificationsError) {
    console.error(`Error fetching recent notifications for user ${user.id}:`, notificationsError);
    return;
  }

  // Process each goal
  for (const goal of goals) {
    try {
      await processGoalNotification(
        supabaseClient,
        user,
        goal,
        preferences,
        recentNotifications || []
      );
    } catch (error) {
      console.error(`Error processing goal ${goal.id} for user ${user.id}:`, error);
    }
  }
}

async function processGoalNotification(
  supabaseClient: any,
  user: any,
  goal: any,
  preferences: any,
  recentNotifications: any[]
) {
  // Check if this goal has received a notification recently
  const goalNotifications = recentNotifications.filter(n => n.goal_id === goal.id);
  const lastNotification = goalNotifications.length > 0 
    ? new Date(Math.max(...goalNotifications.map(n => new Date(n.scheduled_at).getTime())))
    : null;

  // Determine if we should send a notification for this goal
  const shouldSendNotification = await shouldSendGoalNotification(goal, lastNotification);

  if (!shouldSendNotification) {
    console.log(`Skipping notification for goal ${goal.id} - not needed`);
    return;
  }

  // Generate notification using AI
  const notificationData = await generateNotificationWithAI(
    goal,
    preferences,
    goalNotifications
  );

  if (!notificationData) {
    console.log(`Failed to generate notification for goal ${goal.id}`);
    return;
  }

  // Calculate scheduled time within user's notification window
  const scheduledAt = calculateScheduledTime(
    preferences.notification_window_start,
    preferences.notification_window_end,
    preferences.timezone || 'America/Los_Angeles'
  );

  // Insert the scheduled notification
  const { error: insertError } = await supabaseClient
    .from("scheduled_notifications")
    .insert({
      user_id: user.id,
      goal_id: goal.id,
      message: notificationData.message,
      scheduled_at: scheduledAt.toISOString(),
      status: 'pending'
    });

  if (insertError) {
    console.error(`Error inserting notification for goal ${goal.id}:`, insertError);
  } else {
    console.log(`Scheduled notification for goal ${goal.id} at ${scheduledAt}`);
  }
}

async function shouldSendGoalNotification(goal: any, lastNotification: Date | null): Promise<boolean> {
  const now = new Date();
  
  // If no previous notification, send one
  if (!lastNotification) {
    return true;
  }

  // Don't send more than one notification per day
  const daysSinceLastNotification = Math.floor(
    (now.getTime() - lastNotification.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceLastNotification < 1) {
    return false;
  }

  // Ensure at least one notification per week
  if (daysSinceLastNotification >= 7) {
    return true;
  }

  // Goal-specific logic
  switch (goal.category) {
    case 'habit':
      // Daily habits should get notifications more frequently
      return daysSinceLastNotification >= 1;
    
    case 'project':
      // Projects need less frequent notifications unless deadline is near
      const dueDate = goal.data?.dueDate ? new Date(goal.data.dueDate) : null;
      if (dueDate) {
        const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilDue <= 7) {
          return daysSinceLastNotification >= 1; // Daily if due soon
        }
      }
      return daysSinceLastNotification >= 3; // Every 3 days otherwise
    
    case 'save':
      // Savings goals get moderate frequency
      return daysSinceLastNotification >= 2;
    
    case 'learn':
      // Learning goals get regular reminders
      return daysSinceLastNotification >= 2;
    
    default:
      return daysSinceLastNotification >= 3;
  }
}

async function generateNotificationWithAI(
  goal: any,
  preferences: any,
  recentNotifications: any[]
): Promise<{ message: string } | null> {
  try {
    const openAIResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a ${preferences.personality} goal companion that sends personalized push notifications to help users stay motivated with their goals.

PERSONALITY GUIDELINES:
- serious: Professional, direct, focused on results
- friendly: Warm, encouraging, supportive tone
- motivating: Energetic, inspiring, action-oriented
- funny: Light-hearted, playful, uses appropriate humor

NOTIFICATION RULES:
1. Keep messages under 100 characters for mobile notifications
2. Be specific to the goal type and current progress
3. Include actionable advice when appropriate
4. Avoid repetitive language from recent notifications
5. Match the user's personality preference
6. Create urgency without being pushy

GOAL TYPES:
- habit: Focus on consistency, streaks, daily actions
- project: Focus on tasks, deadlines, progress milestones
- learn: Focus on practice, skill building, curriculum progress
- save: Focus on progress toward target, spending awareness

Return ONLY a JSON object with this format:
{"message": "Your notification text here"}

The message should be a complete, ready-to-send push notification.`
            },
            {
              role: "user",
              content: `Generate a notification for this goal:

GOAL DETAILS:
- Title: ${goal.title}
- Category: ${goal.category}
- Description: ${goal.description || 'No description'}
- Data: ${JSON.stringify(goal.data || {})}
- XP Earned: ${goal.xp_earned}
- Created: ${goal.created_at}

RECENT NOTIFICATIONS (to avoid repetition):
${recentNotifications.map(n => `- "${n.message}" (${n.scheduled_at})`).join('\n') || 'None'}

USER PERSONALITY: ${preferences.personality}

Create a personalized, motivating notification that helps the user take action on this goal.`
            }
          ],
          temperature: 0.7,
          max_tokens: 150,
        }),
      }
    );

    if (!openAIResponse.ok) {
      console.error("OpenAI API error:", await openAIResponse.text());
      return null;
    }

    const openAIData = await openAIResponse.json();
    const aiResponse = openAIData.choices[0].message.content;

    try {
      const responseData = JSON.parse(aiResponse);
      return { message: responseData.message };
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      return null;
    }
  } catch (error) {
    console.error("Error generating notification with AI:", error);
    return null;
  }
}

function calculateScheduledTime(
  windowStart: number,
  windowEnd: number,
  timezone: string
): Date {
  const now = new Date();
  
  // Create a date for today in the user's timezone
  const today = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  
  // Random time within the notification window
  const randomHour = Math.floor(Math.random() * (windowEnd - windowStart + 1)) + windowStart;
  const randomMinute = Math.floor(Math.random() * 60);
  
  const scheduledTime = new Date(today);
  scheduledTime.setHours(randomHour, randomMinute, 0, 0);
  
  // If the time has already passed today, schedule for tomorrow
  if (scheduledTime <= now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }
  
  return scheduledTime;
}