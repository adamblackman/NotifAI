import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { thoughtInput, isGuest = false } = await req.json();

    if (!thoughtInput) {
      return new Response(
        JSON.stringify({ error: "thoughtInput is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // For guest users, skip authentication and database operations
    let user = null;
    let supabaseClient = null;

    if (!isGuest) {
      // Get the authorization header
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({
            error: "Authorization header required for authenticated users",
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } },
      );

      // Get the user from the auth header
      const { data: { user: authenticatedUser }, error: userError } =
        await supabaseClient.auth
          .getUser();

      if (userError || !authenticatedUser) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      user = authenticatedUser;
    }

    // Call OpenAI API (works for both guest and authenticated users)
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
                `You are a goal planning assistant. Based on user input, analyze and create at least one goal, multiple if the user mentions multiple different objectives. Each goal should fit into one of these categories: Habit, Project, Learn, or Save.

CRITICAL INSTRUCTIONS:
1. ONLY return a valid JSON object containing an array of goals
2. Format: {"goals": [goal1, goal2, ...]} where each goal can be directly inserted into Supabase
3. NO additional text, explanations, or formatting outside the JSON
4. Each goal JSON must include ALL required fields for its specific goal type
5. Use realistic, achievable targets based on the user's input
6. If user mentions multiple distinct objectives, create separate goals for each
7. If user mentions only one objective, still return an array with one goal

Goal Types and Required Fields:

HABIT:
{
  "title": "string",
  "description": "string", 
  "category": "habit",
  "streak": 0,
  "frequency": [true, true, false, true, true, false, false],
  "targetDays": 30,
  "completions": {},
  "completedDates": []
}

PROJECT:
{
  "title": "string",
  "description": "string",
  "category": "project", 
  "tasks": [{"id": "timestamp", "order": 0, "title": "task name", "completed": false}],
  "progress": 0
}

LEARN:
{
  "title": "string",
  "description": "string",
  "category": "learn",
  "progress": 0,
  "curriculumItems": [{"id": "timestamp", "order": 0, "title": "topic", "completed": false}]
}

SAVE:
{
  "title": "string", 
  "description": "string",
  "category": "save",
  "deadline": "YYYY-MM-DDTHH:mm:ss.sssZ",
  "targetAmount": 1000,
  "currentAmount": 0,
  "spendingTriggers": ["trigger1", "trigger2"]
}

TITLE FORMATTING RULES - Keep titles concise and focused:
- HABIT: Just the activity/thing (e.g., "Retainer" not "Wear Retainer Daily", "Exercise" not "Daily Exercise")
- PROJECT: Just the deliverable/noun (e.g., "Mobile App" not "Build Mobile App", "Website" not "Create Website")  
- LEARN: Just the subject/skill (e.g., "Coding" not "Learn to Code", "Spanish" not "Learn Spanish")
- SAVE: Just the item/goal (e.g., "Car" not "Save for Car", "House" not "Save for House Down Payment")

IMPORTANT for Save goals: Calculate realistic deadlines based on target amount:
- Small amounts ($100-$1000): 1-3 months from now
- Medium amounts ($1000-$10000): 6-12 months from now  
- Large amounts ($10000+): 1-3 years from now
- Car purchase ($15000-$30000): 1-2 years from now
- House down payment ($50000+): 2-5 years from now
Always use ISO format dates in the future from today's date.

Examples:
Input: "I want to wear my retainer everyday and exercise everyday and save up to buy a car"
Output: {"goals": [habit_retainer_goal, habit_exercise_goal, save_car_goal]}

Analyze the user input and identify distinct objectives, then generate ALL required fields with appropriate values for each goal.`,
            },
            {
              role: "user",
              content: thoughtInput,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      },
    );

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error("OpenAI API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate goal plan" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const openAIData = await openAIResponse.json();
    const aiResponse = openAIData.choices[0].message.content;

    try {
      // Parse the AI response as JSON
      const responseData = JSON.parse(aiResponse);
      const goalsData = responseData.goals || [responseData]; // Handle both single goal and multiple goals format

      if (!Array.isArray(goalsData) || goalsData.length === 0) {
        throw new Error("Invalid goals array in AI response");
      }

      // Validate and process each goal
      const processedGoals = [];

      for (let i = 0; i < goalsData.length; i++) {
        const goalData = goalsData[i];

        // Validate required fields
        if (!goalData.title || !goalData.category) {
          throw new Error(`Missing required fields in goal ${i + 1}`);
        }

        // Generate unique IDs for tasks, curriculum items, etc.
        if (goalData.tasks) {
          goalData.tasks = goalData.tasks.map((task: any, index: number) => ({
            ...task,
            id: Date.now().toString() + i + index,
            order: index,
          }));
        }

        if (goalData.curriculumItems) {
          goalData.curriculumItems = goalData.curriculumItems.map((
            item: any,
            index: number,
          ) => ({
            ...item,
            id: Date.now().toString() + i + index,
            order: index,
          }));
        }

        // Ensure proper date formatting for Save goals
        if (goalData.category === "save" && goalData.deadline) {
          goalData.deadline = new Date(goalData.deadline).toISOString();
        }

        processedGoals.push(goalData);
      }

      // For guest users, return goals without saving to database
      if (isGuest) {
        const transformedGoals = processedGoals.map((goalData, index) => ({
          id: Date.now().toString() + index, // Generate temporary ID for guest goals
          title: goalData.title,
          description: goalData.description || "",
          category: goalData.category,
          createdAt: new Date(),
          updatedAt: new Date(),
          xpEarned: 0,
          ...(extractGoalData(goalData)),
        }));

        return new Response(
          JSON.stringify({ goals: transformedGoals }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // For authenticated users, save to database
      const goalRecords = processedGoals.map((goalData) => ({
        user_id: user!.id,
        title: goalData.title,
        description: goalData.description || "",
        category: goalData.category,
        data: extractGoalData(goalData),
        xp_earned: 0,
      }));

      const { data, error } = await supabaseClient!
        .from("goals")
        .insert(goalRecords)
        .select();

      if (error) {
        console.error("Supabase insert error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to save goals to database" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Transform the goals back to the app format
      const transformedGoals = data.map((record) => ({
        id: record.id,
        title: record.title,
        description: record.description,
        category: record.category,
        createdAt: new Date(record.created_at),
        completedAt: record.completed_at
          ? new Date(record.completed_at)
          : undefined,
        xpEarned: record.xp_earned,
        ...(record.data || {}),
      }));

      return new Response(
        JSON.stringify({ goals: transformedGoals }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      console.error("AI Response:", aiResponse);
      return new Response(
        JSON.stringify({ error: "Invalid response format from AI" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

// Helper function to extract goal-specific data
function extractGoalData(goal: any) {
  const { title, description, category, ...data } = goal;
  return data;
}
