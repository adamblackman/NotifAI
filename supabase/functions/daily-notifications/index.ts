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
        // Initialize Supabase client with service role
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("MY_SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );

        console.log("Starting daily notifications cron job...");

        // Get current time info
        const now = new Date();
        const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

        console.log(`Current day of week: ${currentDayOfWeek}`);

        // Get all users with active goals and notification preferences
        const { data: users, error: usersError } = await supabaseClient
            .from("preferences")
            .select(`
        user_id,
        notification_window_start,
        notification_window_end,
        notification_days,
        personality,
        timezone
      `);

        if (usersError) {
            console.error("Error fetching users:", usersError);
            throw usersError;
        }

        console.log(
            `Found ${users?.length || 0} users with notification preferences`,
        );

        if (!users || users.length === 0) {
            return new Response(
                JSON.stringify({
                    message: "No users with notification preferences found",
                }),
                {
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        let notificationsSent = 0;
        let errors = 0;

        // Process each user
        for (const user of users) {
            try {
                // Check if user wants notifications today
                if (
                    !user.notification_days ||
                    !user.notification_days[currentDayOfWeek]
                ) {
                    console.log(
                        `User ${user.user_id} doesn't want notifications on day ${currentDayOfWeek}`,
                    );
                    continue;
                }

                // Get user's current time
                const userTimezone = user.timezone || "America/Los_Angeles";
                const userCurrentTime = new Date().toLocaleString("en-US", {
                    timeZone: userTimezone,
                });
                const userDate = new Date(userCurrentTime);
                const userHour = userDate.getHours();

                // Check if within notification window
                const withinWindow =
                    userHour >= user.notification_window_start &&
                    userHour <= user.notification_window_end;

                if (!withinWindow) {
                    console.log(
                        `User ${user.user_id} outside notification window. Current hour: ${userHour}, Window: ${user.notification_window_start}-${user.notification_window_end}`,
                    );
                    continue;
                }

                // Get user's active goals
                const { data: goals, error: goalsError } = await supabaseClient
                    .from("goals")
                    .select("*")
                    .eq("user_id", user.user_id)
                    .is("completed_at", null);

                if (goalsError) {
                    console.error(
                        `Error fetching goals for user ${user.user_id}:`,
                        goalsError,
                    );
                    errors++;
                    continue;
                }

                if (!goals || goals.length === 0) {
                    console.log(`No active goals for user ${user.user_id}`);
                    continue;
                }

                // Get user's push token
                const { data: tokenData, error: tokenError } =
                    await supabaseClient
                        .from("user_push_tokens")
                        .select("expo_push_token")
                        .eq("user_id", user.user_id)
                        .eq("is_active", true)
                        .limit(1)
                        .single();

                if (tokenError || !tokenData) {
                    console.log(`No push token for user ${user.user_id}`);
                    continue;
                }

                // Process each goal
                for (const goal of goals) {
                    try {
                        // Check if we already sent a notification today for this goal
                        const todayStart = new Date();
                        todayStart.setHours(0, 0, 0, 0);

                        const { data: existingNotification } =
                            await supabaseClient
                                .from("notification_logs")
                                .select("id")
                                .eq("user_id", user.user_id)
                                .eq("goal_id", goal.id)
                                .gte("sent_at", todayStart.toISOString())
                                .limit(1);

                        if (
                            existingNotification &&
                            existingNotification.length > 0
                        ) {
                            console.log(
                                `Already sent notification today for goal ${goal.id}`,
                            );
                            continue;
                        }

                        // Analyze goal context
                        const goalContext = await analyzeGoalContext(
                            goal,
                            supabaseClient,
                        );

                        // Generate AI notification content
                        const notificationContent =
                            await generateNotificationContent(
                                goal,
                                goalContext,
                                user.personality,
                            );

                        // Send notification
                        const success = await sendPushNotification(
                            tokenData.expo_push_token,
                            notificationContent,
                            goal,
                        );

                        if (success) {
                            // Log the notification
                            await supabaseClient
                                .from("notification_logs")
                                .insert({
                                    user_id: user.user_id,
                                    goal_id: goal.id,
                                    content: notificationContent.body,
                                    notification_type: goal.category,
                                });

                            notificationsSent++;
                            console.log(
                                `Sent notification for goal ${goal.id} to user ${user.user_id}`,
                            );
                        } else {
                            errors++;
                        }
                    } catch (goalError) {
                        console.error(
                            `Error processing goal ${goal.id}:`,
                            goalError,
                        );
                        errors++;
                    }
                }
            } catch (userError) {
                console.error(
                    `Error processing user ${user.user_id}:`,
                    userError,
                );
                errors++;
            }
        }

        console.log(
            `Cron job completed. Sent: ${notificationsSent}, Errors: ${errors}`,
        );

        return new Response(
            JSON.stringify({
                message: "Cron job completed",
                notificationsSent,
                errors,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    } catch (error) {
        console.error("Cron job error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
        );
    }
});

// Helper function to analyze goal context
async function analyzeGoalContext(goal: any, supabaseClient: any) {
    const context: any = {
        type: goal.category,
        title: goal.title,
        createdDaysAgo: Math.floor(
            (Date.now() - new Date(goal.created_at).getTime()) /
                (1000 * 60 * 60 * 24),
        ),
    };

    const goalData = goal.data || {};

    switch (goal.category) {
        case "habit":
            const completions = goalData.completions || {};
            const completedDates = goalData.completedDates || [];
            const today = new Date().toISOString().split("T")[0];

            context.streak = goalData.streak || 0;
            context.targetDays = goalData.targetDays || 30;
            context.completedToday = completions[today] === true;
            context.totalCompletions = completedDates.length;
            context.progressPercent = Math.round(
                (completedDates.length / (goalData.targetDays || 30)) * 100,
            );
            break;

        case "project":
            const tasks = goalData.tasks || [];
            const completedTasks = tasks.filter((t: any) => t.completed).length;

            context.totalTasks = tasks.length;
            context.completedTasks = completedTasks;
            context.progressPercent = tasks.length > 0
                ? Math.round((completedTasks / tasks.length) * 100)
                : 0;
            context.nextTask = tasks.find((t: any) => !t.completed)?.title;

            if (goal.due_date) {
                const daysUntilDue = Math.ceil(
                    (new Date(goal.due_date).getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24),
                );
                context.daysUntilDue = daysUntilDue;
            }
            break;

        case "learn":
            const curriculumItems = goalData.curriculumItems || [];
            const completedItems =
                curriculumItems.filter((item: any) => item.completed).length;

            context.totalItems = curriculumItems.length;
            context.completedItems = completedItems;
            context.progressPercent = curriculumItems.length > 0
                ? Math.round((completedItems / curriculumItems.length) * 100)
                : 0;
            context.nextTopic = curriculumItems.find((item: any) =>
                !item.completed
            )?.title;
            break;

        case "save":
            context.targetAmount = goalData.targetAmount || 0;
            context.currentAmount = goalData.currentAmount || 0;
            context.progressPercent = goalData.targetAmount > 0
                ? Math.round(
                    (goalData.currentAmount / goalData.targetAmount) * 100,
                )
                : 0;

            if (goalData.deadline) {
                const daysUntilDeadline = Math.ceil(
                    (new Date(goalData.deadline).getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24),
                );
                context.daysUntilDeadline = daysUntilDeadline;
            }
            break;
    }

    return context;
}

// Helper function to generate AI notification content
async function generateNotificationContent(
    goal: any,
    context: any,
    personality: string,
) {
    try {
        const prompt =
            `Generate a concise, motivating push notification for this goal:

Goal Type: ${context.type}
Title: "${context.title}"
Progress: ${context.progressPercent}%
Context: ${JSON.stringify(context)}
User Personality: ${personality}

Requirements:
- Maximum 80 characters for the message
- Include relevant emoji
- Be encouraging and specific to current status
- Match ${personality} personality tone
- Don't mention the app name
- Be conversational and personal

Return only the notification message text.`;

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
                                "You are a motivational goal coach. Generate short, encouraging push notification messages.",
                        },
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                    temperature: 0.7,
                    max_tokens: 100,
                }),
            },
        );

        if (!openAIResponse.ok) {
            throw new Error("OpenAI API error");
        }

        const aiData = await openAIResponse.json();
        const message = aiData.choices[0].message.content.trim();

        return {
            title: goal.title,
            body: message,
            data: {
                goalId: goal.id,
                goalType: goal.category,
                action: getNotificationAction(goal.category),
            },
        };
    } catch (error) {
        console.error("Error generating AI content:", error);

        // Fallback to template-based notifications
        return generateFallbackNotification(goal, context);
    }
}

// Fallback notification templates
function generateFallbackNotification(goal: any, context: any) {
    const templates = {
        habit: `Day ${
            context.createdDaysAgo + 1
        } of your ${goal.title}! Keep going! 💪`,
        project:
            `${context.completedTasks}/${context.totalTasks} tasks done on ${goal.title}. What's next? 🚀`,
        learn:
            `${context.progressPercent}% through ${goal.title}. Ready to learn more? 📚`,
        save:
            `$${context.currentAmount} saved toward your $${context.targetAmount} goal! 💰`,
    };

    return {
        title: goal.title,
        body: templates[goal.category as keyof typeof templates] ||
            `Time to work on ${goal.title}! 🎯`,
        data: {
            goalId: goal.id,
            goalType: goal.category,
            action: getNotificationAction(goal.category),
        },
    };
}

// Get notification action based on goal type
function getNotificationAction(goalType: string) {
    const actions = {
        habit: "COMPLETE_HABIT",
        project: "COMPLETE_TASK",
        learn: "MARK_STUDIED",
        save: "LOG_SAVINGS",
    };
    return actions[goalType as keyof typeof actions] || "VIEW_GOAL";
}

// Helper function to send push notification
async function sendPushNotification(
    pushToken: string,
    content: any,
    goal: any,
) {
    try {
        const message = {
            to: pushToken,
            sound: "default",
            title: content.title,
            body: content.body,
            data: content.data,
            categoryId: getNotificationCategory(goal.category),
        };

        const response = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Accept-encoding": "gzip, deflate",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(message),
        });

        const result = await response.json();

        if (result.data && result.data.status === "error") {
            console.error("Push notification error:", result.data.message);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Error sending push notification:", error);
        return false;
    }
}

// Get notification category for interactive actions
function getNotificationCategory(goalType: string) {
    const categories = {
        habit: "HABIT_REMINDER",
        project: "PROJECT_REMINDER",
        learn: "LEARN_REMINDER",
        save: "SAVE_REMINDER",
    };
    return categories[goalType as keyof typeof categories] || "GOAL_REMINDER";
}
