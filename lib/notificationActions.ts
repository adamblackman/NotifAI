import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { supabase } from "./supabase";

// Handle notification action responses
export async function handleNotificationAction(
    response: Notifications.NotificationResponse,
) {
    const { notification, actionIdentifier } = response;
    const goalId = notification.request.content.data?.goalId;
    const goalType = notification.request.content.data?.goalType;

    if (!goalId || !goalType) {
        console.log("Missing goal data in notification");
        return;
    }

    try {
        switch (actionIdentifier) {
            case "COMPLETE_HABIT":
                await completeHabitForToday(goalId);
                break;

            case "COMPLETE_TASK":
                await completeNextTask(goalId);
                break;

            case "MARK_STUDIED":
                await markStudySession(goalId);
                break;

            case "LOG_SAVINGS":
                // This opens the app to a savings entry screen
                router.push(
                    `/tracking/save?goalId=${goalId}&action=log-savings`,
                );
                break;

            case "VIEW_GOAL":
                router.push(`/tracking/${goalType}?goalId=${goalId}`);
                break;

            default:
                // Default action - open the goal
                router.push(`/tracking/${goalType}?goalId=${goalId}`);
                break;
        }

        // Log the action
        await logNotificationAction(goalId, actionIdentifier);
    } catch (error) {
        console.error("Error handling notification action:", error);
    }
}

// Complete habit for today
async function completeHabitForToday(goalId: string) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Get current goal data
        const { data: goal, error: goalError } = await supabase
            .from("goals")
            .select("*")
            .eq("id", goalId)
            .eq("user_id", user.id)
            .single();

        if (goalError || !goal) {
            throw new Error("Goal not found");
        }

        const today = new Date().toISOString().split("T")[0];
        const goalData = goal.data || {};
        const completions = goalData.completions || {};
        const completedDates = goalData.completedDates || [];

        // Check if already completed today
        if (completions[today]) {
            console.log("Habit already completed today");
            return;
        }

        // Update completions
        completions[today] = true;
        const newCompletedDates = [...completedDates, today];

        // Calculate new streak
        let streak = 1;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        if (completions[yesterdayStr]) {
            streak = (goalData.streak || 0) + 1;
        }

        // Update goal
        const { error } = await supabase
            .from("goals")
            .update({
                data: {
                    ...goalData,
                    completions,
                    completedDates: newCompletedDates,
                    streak,
                },
                updated_at: new Date().toISOString(),
            })
            .eq("id", goalId)
            .eq("user_id", user.id);

        if (error) throw error;

        console.log("Habit completed for today");
    } catch (error) {
        console.error("Error completing habit:", error);
    }
}

// Complete next task in project
async function completeNextTask(goalId: string) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Get current goal data
        const { data: goal, error: goalError } = await supabase
            .from("goals")
            .select("*")
            .eq("id", goalId)
            .eq("user_id", user.id)
            .single();

        if (goalError || !goal) {
            throw new Error("Goal not found");
        }

        const goalData = goal.data || {};
        const tasks = goalData.tasks || [];

        // Find next incomplete task
        const nextTask = tasks.find((task: any) => !task.completed);
        if (!nextTask) {
            console.log("No incomplete tasks found");
            return;
        }

        // Mark task as completed
        const updatedTasks = tasks.map((task: any) =>
            task.id === nextTask.id ? { ...task, completed: true } : task
        );

        // Calculate progress
        const completedTasks = updatedTasks.filter((task: any) =>
            task.completed
        ).length;
        const progress = Math.round(
            (completedTasks / updatedTasks.length) * 100,
        );

        // Update goal
        const { error } = await supabase
            .from("goals")
            .update({
                data: {
                    ...goalData,
                    tasks: updatedTasks,
                    progress,
                },
                updated_at: new Date().toISOString(),
            })
            .eq("id", goalId)
            .eq("user_id", user.id);

        if (error) throw error;

        console.log("Task completed:", nextTask.title);
    } catch (error) {
        console.error("Error completing task:", error);
    }
}

// Mark study session complete
async function markStudySession(goalId: string) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Get current goal data
        const { data: goal, error: goalError } = await supabase
            .from("goals")
            .select("*")
            .eq("id", goalId)
            .eq("user_id", user.id)
            .single();

        if (goalError || !goal) {
            throw new Error("Goal not found");
        }

        const goalData = goal.data || {};
        const curriculumItems = goalData.curriculumItems || [];

        // Find next incomplete curriculum item
        const nextItem = curriculumItems.find((item: any) => !item.completed);
        if (!nextItem) {
            console.log("No incomplete curriculum items found");
            return;
        }

        // Mark item as completed
        const updatedItems = curriculumItems.map((item: any) =>
            item.id === nextItem.id ? { ...item, completed: true } : item
        );

        // Calculate progress
        const completedItems = updatedItems.filter((item: any) =>
            item.completed
        ).length;
        const progress = Math.round(
            (completedItems / updatedItems.length) * 100,
        );

        // Update goal
        const { error } = await supabase
            .from("goals")
            .update({
                data: {
                    ...goalData,
                    curriculumItems: updatedItems,
                    progress,
                },
                updated_at: new Date().toISOString(),
            })
            .eq("id", goalId)
            .eq("user_id", user.id);

        if (error) throw error;

        console.log("Study session completed:", nextItem.title);
    } catch (error) {
        console.error("Error marking study session:", error);
    }
}

// Log notification action for analytics
async function logNotificationAction(goalId: string, actionIdentifier: string) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
            .from("notification_logs")
            .update({
                action_taken: actionIdentifier,
                action_at: new Date().toISOString(),
            })
            .eq("user_id", user.id)
            .eq("goal_id", goalId)
            .gte("sent_at", new Date().toISOString().split("T")[0]) // Today's notifications
            .order("sent_at", { ascending: false })
            .limit(1);
    } catch (error) {
        console.error("Error logging notification action:", error);
    }
}
