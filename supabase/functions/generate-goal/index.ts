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

    // Get today's date for the AI prompt
    const today = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD

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

TODAY'S DATE: ${today}

CRITICAL INSTRUCTIONS:
1. ONLY return a valid JSON object containing an array of goals
2. Format: {"goals": [goal1, goal2, ...]} where each goal can be directly inserted into Supabase
3. NO additional text, explanations, or formatting outside the JSON
4. Each goal JSON must include ALL required fields for its specific goal type
5. Use realistic, achievable targets based on the user's input
6. CAREFULLY ANALYZE the input for MULTIPLE DISTINCT OBJECTIVES - create separate goals for each one
7. If user mentions only one objective, still return an array with one goal
8. ALWAYS create at least one goal, even if the input seems unrelated - use creative interpretation to find connections
9. For unclear inputs, extract any keywords, themes, or implied interests to create relevant goals

MULTIPLE GOAL IDENTIFICATION:
Look for these patterns that indicate separate goals:
- "and" connecting different activities (novel AND watercolor AND mindfulness AND save)
- Commas separating different objectives
- Different action verbs (write, learn, become, save)
- Different domains (creative writing, art, wellness, financial)

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

SPECIFIC REQUIREMENTS:

HABIT targetDays Guidelines:
- Simple daily habits (water, vitamins, etc.): 30-60 days
- Exercise/fitness habits: 60-90 days  
- Major lifestyle changes (sleep, diet): 90-120 days
- Complex skill-building habits (practice instruments, etc.): 120-180 days
- Maximum: 180 days (6 months)

PROJECT and LEARN Goals:
- MUST include 6-12 tasks/curriculumItems
- Break down the goal into logical, sequential steps
- Each step should be specific and actionable
- Order them from 0 to (n-1) where n is the number of items

TITLE FORMATTING RULES - Keep titles concise and focused:
- HABIT: Just the activity/thing (e.g., "Retainer" not "Wear Retainer Daily", "Exercise" not "Daily Exercise")
- PROJECT: Just the deliverable/noun (e.g., "Mobile App" not "Build Mobile App", "Website" not "Create Website")  
- LEARN: Just the subject/skill (e.g., "Coding" not "Learn to Code", "Spanish" not "Learn Spanish")
- SAVE: Just the item/goal (e.g., "Car" not "Save for Car", "House" not "Save for House Down Payment")

CRITICAL for Save goals - Use TODAY'S DATE (${today}) to calculate realistic future deadlines:
- Small amounts ($100-$1000): 3-6 months from ${today}
- Medium amounts ($1000-$10000): 6-18 months from ${today}  
- Large amounts ($10000+): 1-3 years from ${today}
- Car purchase ($15000-$30000): 1-2 years from ${today}
- House down payment ($50000+): 2-5 years from ${today}
- Emergency fund ($3000-$10000): 6-12 months from ${today}
- Vacation ($1000-$5000): 3-12 months from ${today}

ALWAYS ensure deadline is AT LEAST 3 months in the future from ${today}. Use ISO format: YYYY-MM-DDTHH:mm:ss.sssZ

INTELLIGENT FALLBACK STRATEGY:
When input seems unrelated to goal-setting, use creative interpretation:
- Look for ANY keywords that could suggest interests (food→cooking, weather→outdoor activities, animals→pet care)
- Consider the emotional tone (stressed→stress management, happy→maintaining positivity)
- If mentioning objects/places, think about related skills or projects
- If completely abstract, create a goal about improving the skill that would help with that type of thinking
- Extract any numbers mentioned and use them meaningfully in targets

Examples of Creative Interpretation:
- "I like pizza" → LEARN: "Cooking" (learn to make different cuisines including Italian)
- "The weather is nice" → HABIT: "Outdoor Time" (spend time outside daily)
- "My cat is sleeping" → PROJECT: "Pet Care System" (organize pet care routine and supplies)
- "404 error" → LEARN: "Web Development" (understand how websites work)
- "Feeling overwhelmed" → HABIT: "Mindfulness" (daily meditation/breathing exercises)
- "Blue green red" → LEARN: "Art Fundamentals" (color theory and basic art skills)

Only as a last resort for truly meaningless input (random characters, pure nonsense), default to:
- HABIT: "Daily Reflection" (journaling or self-reflection practice)

Examples:
Input: "I want to wear my retainer everyday and exercise everyday and save up to buy a car"
Output: {"goals": [habit_retainer_goal, habit_exercise_goal, save_car_goal]}
MULTI-GOAL EXAMPLE:
Input: "I want to write a novel, learn watercolor painting, and become more mindful and present in my daily life and save for a house"
Expected Output: {"goals": [
  {PROJECT goal for novel with 6-10 writing tasks},
  {LEARN goal for watercolor with 6-10 curriculum items},
  {HABIT goal for mindfulness with appropriate targetDays},
  {SAVE goal for house with realistic deadline and amount}
]}

Analyze the user input and identify ALL distinct objectives, then generate ALL required fields with appropriate values for each goal.`,
            },
            {
              role: "user",
              content: thoughtInput,
            },
          ],
          temperature: 0.7,
          max_tokens: 1500,
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
