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
        const { goalId, userId, category } = await req.json();

        if (!goalId || !userId || !category) {
            return new Response(
                JSON.stringify({ error: "Missing required parameters" }),
                {
                    status: 400,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                },
            );
        }

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

        // Get the goal data
        const { data: goal, error: goalError } = await supabaseClient
            .from("goals")
            .select("*")
            .eq("id", goalId)
            .eq("user_id", userId)
            .single();

        if (goalError || !goal) {
            return new Response(
                JSON.stringify({ error: "Goal not found" }),
                {
                    status: 404,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        // If goal is already completed, return success without doing anything
        if (goal.completed_at) {
            return new Response(
                JSON.stringify({
                    success: true,
                    message: "Goal already completed",
                }),
                {
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        let updateData: any = {};
        let shouldCompleteGoal = false;

        // Handle completion based on goal category
        switch (category) {
            case "save": {
                // Add today's date to save dates
                const today = new Date().toISOString().split("T")[0];
                const currentSaveDates = goal.data?.SaveDates || [];

                if (!currentSaveDates.includes(today)) {
                    const newSaveDates = [...currentSaveDates, today];
                    updateData = {
                        data: {
                            ...goal.data,
                            SaveDates: newSaveDates,
                        },
                        xp_earned: goal.xp_earned + 10, // Award 10 XP for daily save
                    };
                }
                break;
            }

            case "habit": {
                // Add today's date to completed dates
                const today = new Date().toISOString().split("T")[0];
                const currentCompletedDates = goal.data?.completedDates || [];

                if (!currentCompletedDates.includes(today)) {
                    const newCompletedDates = [...currentCompletedDates, today];
                    const targetDays = goal.data?.targetDays || 0;

                    updateData = {
                        data: {
                            ...goal.data,
                            completedDates: newCompletedDates,
                        },
                        xp_earned: goal.xp_earned + 10, // Award 10 XP for daily habit
                    };

                    // Check if habit should be completed
                    if (
                        targetDays > 0 && newCompletedDates.length >= targetDays
                    ) {
                        shouldCompleteGoal = true;
                        updateData.completed_at = new Date().toISOString();
                        updateData.xp_earned += 50; // Bonus XP for completing goal
                    }
                }
                break;
            }

            case "project": {
                // Complete the next uncompleted task
                const tasks = goal.data?.tasks || [];
                const nextUncompletedIndex = tasks.findIndex((task: any) =>
                    !task.completed
                );

                if (nextUncompletedIndex !== -1) {
                    const updatedTasks = [...tasks];
                    updatedTasks[nextUncompletedIndex] = {
                        ...updatedTasks[nextUncompletedIndex],
                        completed: true,
                    };

                    updateData = {
                        data: {
                            ...goal.data,
                            tasks: updatedTasks,
                        },
                        xp_earned: goal.xp_earned + 15, // Award 15 XP for task completion
                    };

                    // Check if all tasks are completed
                    const allTasksCompleted = updatedTasks.every((task: any) =>
                        task.completed
                    );
                    if (allTasksCompleted) {
                        shouldCompleteGoal = true;
                        updateData.completed_at = new Date().toISOString();
                        updateData.xp_earned += 100; // Bonus XP for completing project
                    }
                }
                break;
            }

            case "learn": {
                // Complete the next uncompleted lesson
                const curriculumItems = goal.data?.curriculumItems || [];
                const nextUncompletedIndex = curriculumItems.findIndex((
                    item: any,
                ) => !item.completed);

                if (nextUncompletedIndex !== -1) {
                    const updatedCurriculumItems = [...curriculumItems];
                    updatedCurriculumItems[nextUncompletedIndex] = {
                        ...updatedCurriculumItems[nextUncompletedIndex],
                        completed: true,
                    };

                    updateData = {
                        data: {
                            ...goal.data,
                            curriculumItems: updatedCurriculumItems,
                        },
                        xp_earned: goal.xp_earned + 20, // Award 20 XP for lesson completion
                    };

                    // Check if all lessons are completed
                    const allLessonsCompleted = updatedCurriculumItems.every((
                        item: any,
                    ) => item.completed);
                    if (allLessonsCompleted) {
                        shouldCompleteGoal = true;
                        updateData.completed_at = new Date().toISOString();
                        updateData.xp_earned += 75; // Bonus XP for completing learning goal
                    }
                }
                break;
            }

            default:
                return new Response(
                    JSON.stringify({ error: "Invalid goal category" }),
                    {
                        status: 400,
                        headers: {
                            ...corsHeaders,
                            "Content-Type": "application/json",
                        },
                    },
                );
        }

        // Update the goal if there are changes
        if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabaseClient
                .from("goals")
                .update(updateData)
                .eq("id", goalId);

            if (updateError) {
                console.error("Error updating goal:", updateError);
                return new Response(
                    JSON.stringify({ error: "Failed to update goal" }),
                    {
                        status: 500,
                        headers: {
                            ...corsHeaders,
                            "Content-Type": "application/json",
                        },
                    },
                );
            }

            // Update user's profile XP
            const { error: profileError } = await supabaseClient
                .from("profiles")
                .update({
                    xp: goal.xp_earned +
                        (updateData.xp_earned - goal.xp_earned),
                })
                .eq("id", userId);

            if (profileError) {
                console.error("Error updating profile XP:", profileError);
            }
        }

        const message = shouldCompleteGoal
            ? "🎉 Goal completed! Congratulations!"
            : "✅ Progress updated successfully!";

        return new Response(
            JSON.stringify({
                success: true,
                message,
                goalCompleted: shouldCompleteGoal,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    } catch (error) {
        console.error("Function error:", error);
        return new Response(
            JSON.stringify({
                error: (error as Error).message || "Internal server error",
            }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
        );
    }
});
