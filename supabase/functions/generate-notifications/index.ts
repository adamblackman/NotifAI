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
    // Use service role key for admin access
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

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

    let totalNotificationsCreated = 0;

    for (const user of users) {
      try {
        const notificationsCreated = await processUserNotifications(
          supabaseClient,
          user,
        );
        totalNotificationsCreated += notificationsCreated;
      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error);
        // Continue with other users even if one fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processedUsers: users.length,
        notificationsCreated: totalNotificationsCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

async function processUserNotifications(
  supabaseClient: any,
  user: any,
): Promise<number> {
  const preferences = user.preferences;
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const mondayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Monday = 0 index

  if (!preferences.notification_days[mondayIndex]) {
    return 0;
  }

  // Get user's active goals
  const { data: goals, error: goalsError } = await supabaseClient
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .is("completed_at", null);

  if (goalsError) {
    console.error(`Error fetching goals for user ${user.id}:`, goalsError);
    return 0;
  }

  if (!goals || goals.length === 0) {
    return 0;
  }

  // Get recent notifications for this user (past week) + today's scheduled
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data: recentNotifications, error: notificationsError } =
    await supabaseClient
      .from("scheduled_notifications")
      .select("goal_id, scheduled_at, message")
      .eq("user_id", user.id)
      .gte("scheduled_at", weekAgo.toISOString());

  // Get today's scheduled notifications to avoid conflicts
  const { data: todaysNotifications, error: todaysError } = await supabaseClient
    .from("scheduled_notifications")
    .select("scheduled_at")
    .eq("user_id", user.id)
    .gte("scheduled_at", todayStart.toISOString())
    .lte("scheduled_at", todayEnd.toISOString())
    .order("scheduled_at");

  if (notificationsError || todaysError) {
    console.error(
      `Error fetching notifications for user ${user.id}:`,
      notificationsError || todaysError,
    );
    return 0;
  }

  let notificationsCreated = 0;
  const existingTimes = (todaysNotifications || []).map((n) =>
    new Date(n.scheduled_at)
  );

  // Process each goal
  for (const goal of goals) {
    try {
      const created = await processGoalNotification(
        supabaseClient,
        user,
        goal,
        preferences,
        recentNotifications || [],
        existingTimes,
      );
      if (created) {
        notificationsCreated++;
        // Add the new time to existing times for spacing calculations
        const newTime = await calculateScheduledTimeForGoal(
          goal,
          preferences.notification_window_start,
          preferences.notification_window_end,
          preferences.timezone || "America/Los_Angeles",
          existingTimes,
        );
        existingTimes.push(newTime);
      }
    } catch (error) {
      console.error(
        `Error processing goal ${goal.id} for user ${user.id}:`,
        error,
      );
    }
  }

  return notificationsCreated;
}

async function processGoalNotification(
  supabaseClient: any,
  user: any,
  goal: any,
  preferences: any,
  recentNotifications: any[],
  existingTimes: Date[],
): Promise<boolean> {
  // Check if this goal has received a notification recently
  const goalNotifications = recentNotifications.filter((n) =>
    n.goal_id === goal.id
  );
  const lastNotification = goalNotifications.length > 0
    ? new Date(
      Math.max(
        ...goalNotifications.map((n) => new Date(n.scheduled_at).getTime()),
      ),
    )
    : null;

  // Determine if we should send a notification for this goal
  const shouldSendNotification = await shouldSendGoalNotification(
    goal,
    lastNotification,
  );

  if (!shouldSendNotification) {
    return false;
  }

  // Generate notification with AI-suggested timing
  const notificationData = await generateNotificationWithAI(
    goal,
    preferences,
    goalNotifications,
  );

  if (!notificationData) {
    return false;
  }

  // Calculate scheduled time with proper spacing and context-aware timing
  const scheduledAt = await calculateScheduledTimeForGoal(
    goal,
    preferences.notification_window_start,
    preferences.notification_window_end,
    preferences.timezone || "America/Los_Angeles",
    existingTimes,
  );

  // Insert the scheduled notification
  const { error: insertError } = await supabaseClient
    .from("scheduled_notifications")
    .insert({
      user_id: user.id,
      goal_id: goal.id,
      message: notificationData.message,
      scheduled_at: scheduledAt.toISOString(),
      status: "pending",
    });

  if (insertError) {
    console.error(
      `Error inserting notification for goal ${goal.id}:`,
      insertError,
    );
    return false;
  } else {
    return true;
  }
}

async function shouldSendGoalNotification(
  goal: any,
  lastNotification: Date | null,
): Promise<boolean> {
  const now = new Date();

  // If no previous notification, send one
  if (!lastNotification) {
    return true;
  }

  // Don't send more than one notification per day
  const daysSinceLastNotification = Math.floor(
    (now.getTime() - lastNotification.getTime()) / (1000 * 60 * 60 * 24),
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
    case "habit":
      // Daily habits should get notifications more frequently
      return daysSinceLastNotification >= 1;

    case "project":
      // Projects need less frequent notifications unless deadline is near
      const dueDate = goal.data?.dueDate ? new Date(goal.data.dueDate) : null;
      if (dueDate) {
        const daysUntilDue = Math.floor(
          (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysUntilDue <= 7) {
          return daysSinceLastNotification >= 1; // Daily if due soon
        }
      }
      return daysSinceLastNotification >= 3; // Every 3 days otherwise

    case "save":
      // Savings goals get moderate frequency
      return daysSinceLastNotification >= 2;

    case "learn":
      // Learning goals get regular reminders
      return daysSinceLastNotification >= 2;

    default:
      return daysSinceLastNotification >= 3;
  }
}

async function generateNotificationWithAI(
  goal: any,
  preferences: any,
  recentNotifications: any[],
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
              content:
                `You are a ${preferences.personality} goal companion that sends personalized push notifications to help users stay motivated with their goals.

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

TIMING INTELLIGENCE:
Use your best judgment to determine appropriate timing based on the goal's nature. Consider these examples but adapt based on context:

- Morning routines (wake up, breakfast, vitamins) → Early morning (7-9am)
- Evening routines (skincare, retainer, wind down) → Evening (7-9pm)  
- Exercise/fitness goals → Early morning (6-8am) or after work (5-7pm)
- Work/professional projects → Morning focus time (8-10am) or post-work (5-7pm)
- Learning/study goals → After work when mind is fresh (5-8pm) or morning (7-9am)
- Financial/saving goals → Morning planning time (8-10am)
- Creative pursuits → When inspiration typically strikes (varies by person)
- Social/relationship goals → Context-dependent timing

The system will handle the actual scheduling - your job is to create an engaging message that motivates action.

Return ONLY a JSON object with this format:
{"message": "Your notification text here"}

The message should be a complete, ready-to-send push notification.`,
            },
            {
              role: "user",
              content: `Generate a notification for this goal:

GOAL DETAILS:
- Title: ${goal.title}
- Category: ${goal.category}
- Description: ${goal.description || "No description"}
- Data: ${JSON.stringify(goal.data || {})}
- XP Earned: ${goal.xp_earned}
- Created: ${goal.created_at}

RECENT NOTIFICATIONS (to avoid repetition):
${
                recentNotifications.map((n) =>
                  `- "${n.message}" (${n.scheduled_at})`
                ).join("\n") || "None"
              }

USER PERSONALITY: ${preferences.personality}

Create a personalized, motivating notification that helps the user take action on this goal.`,
            },
          ],
          temperature: 0.7,
          max_tokens: 150,
        }),
      },
    );

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error("OpenAI API error:", errorText);
      return null;
    }

    const openAIData = await openAIResponse.json();
    const aiResponse = openAIData.choices[0].message.content;

    try {
      const responseData = JSON.parse(aiResponse);
      return { message: responseData.message };
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      console.error("AI Response:", aiResponse);
      return null;
    }
  } catch (error) {
    console.error("Error generating notification with AI:", error);
    return null;
  }
}

async function calculateScheduledTimeForGoal(
  goal: any,
  windowStart: number,
  windowEnd: number,
  timezone: string,
  existingTimes: Date[],
): Promise<Date> {
  const now = new Date();

  // Get optimal time range for this goal type
  const optimalTimes = getOptimalTimeForGoalType(goal, windowStart, windowEnd);

  // Create a date for today in the user's timezone
  // Use Intl.DateTimeFormat to properly handle timezone conversion
  const userNow = new Date(now.toLocaleString("sv-SE", { timeZone: timezone }));
  const today = new Date(
    userNow.getFullYear(),
    userNow.getMonth(),
    userNow.getDate(),
  );

  // Try to find a time within optimal range that doesn't conflict
  let attempts = 0;
  const maxAttempts = 20;

  while (attempts < maxAttempts) {
    // Pick random time within optimal range
    const randomHour =
      Math.floor(Math.random() * (optimalTimes.end - optimalTimes.start + 1)) +
      optimalTimes.start;
    const randomMinute = Math.floor(Math.random() * 60);

    const scheduledTime = new Date(today);
    scheduledTime.setHours(randomHour, randomMinute, 0, 0);

    // If the time has already passed today, schedule for tomorrow
    // Compare against user's current time, not server time
    if (scheduledTime <= userNow) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    // Check if this time conflicts with existing notifications (within 1 hour)
    const hasConflict = existingTimes.some((existingTime) => {
      const timeDiff = Math.abs(
        scheduledTime.getTime() - existingTime.getTime(),
      );
      return timeDiff < (60 * 60 * 1000); // 1 hour in milliseconds
    });

    if (!hasConflict) {
      return scheduledTime;
    }

    attempts++;
  }

  // If we can't find a non-conflicting optimal time, fall back to any time in window with spacing
  return findNextAvailableTime(windowStart, windowEnd, timezone, existingTimes);
}

function getOptimalTimeForGoalType(
  goal: any,
  windowStart: number,
  windowEnd: number,
): { start: number; end: number } {
  const category = goal.category;

  // Clamp to user's notification window
  const clamp = (hour: number) =>
    Math.max(windowStart, Math.min(windowEnd, hour));

  switch (category) {
    case "habit":
      // Let AI determine if morning or evening is better - provide broad range
      return { start: clamp(7), end: clamp(21) };

    case "learn":
      // Learning can work morning or after work - let AI decide
      return { start: clamp(7), end: clamp(20) };

    case "project":
      // Projects work well morning or after work - let AI decide
      return { start: clamp(8), end: clamp(19) };

    case "save":
      // Financial goals generally work well throughout the day
      return { start: clamp(8), end: clamp(18) };

    default:
      // Use full notification window for unknown categories
      return { start: windowStart, end: windowEnd };
  }
}

function findNextAvailableTime(
  windowStart: number,
  windowEnd: number,
  timezone: string,
  existingTimes: Date[],
): Date {
  const now = new Date();
  // Properly convert to user's timezone
  const userNow = new Date(now.toLocaleString("sv-SE", { timeZone: timezone }));
  const today = new Date(
    userNow.getFullYear(),
    userNow.getMonth(),
    userNow.getDate(),
  );

  // Start from the beginning of the window
  const startTime = new Date(today);
  startTime.setHours(windowStart, 0, 0, 0);

  // If start time has passed, schedule for tomorrow
  if (startTime <= userNow) {
    startTime.setDate(startTime.getDate() + 1);
  }

  // Find next available slot with 1-hour spacing
  let currentTime = new Date(startTime);

  while (currentTime.getHours() <= windowEnd) {
    const hasConflict = existingTimes.some((existingTime) => {
      const timeDiff = Math.abs(currentTime.getTime() - existingTime.getTime());
      return timeDiff < (60 * 60 * 1000); // 1 hour spacing
    });

    if (!hasConflict) {
      return currentTime;
    }

    // Move to next hour
    currentTime.setHours(currentTime.getHours() + 1);
  }

  // If no slot available today, try tomorrow starting from window start
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(windowStart, 0, 0, 0);

  return tomorrow;
}
