import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get the user from the auth header
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { thoughtInput } = await req.json()

    if (!thoughtInput) {
      return new Response(
        JSON.stringify({ error: 'thoughtInput is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: `You are a goal planning assistant. Based on user input, create ONE goal that fits into one of these categories: Habit, Project, Learn, or Save.

CRITICAL INSTRUCTIONS:
1. ONLY return a valid JSON object that can be directly inserted into Supabase
2. NO additional text, explanations, or formatting
3. The JSON must include ALL required fields for the specific goal type
4. Use realistic, achievable targets based on the user's input

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
  "deadline": "2025-06-09T03:00:00.000Z",
  "targetAmount": 1000,
  "currentAmount": 0,
  "spendingTriggers": ["trigger1", "trigger2"]
}

Analyze the user input and determine which category fits best, then generate ALL required fields with appropriate values.`
          },
          {
            role: 'user',
            content: thoughtInput
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text()
      console.error('OpenAI API error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to generate goal plan' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const openAIData = await openAIResponse.json()
    const aiResponse = openAIData.choices[0].message.content

    try {
      // Parse the AI response as JSON
      const goalData = JSON.parse(aiResponse)
      
      // Validate required fields
      if (!goalData.title || !goalData.category) {
        throw new Error('Missing required fields in AI response')
      }

      // Generate unique IDs for tasks, curriculum items, etc.
      if (goalData.tasks) {
        goalData.tasks = goalData.tasks.map((task: any, index: number) => ({
          ...task,
          id: Date.now().toString() + index,
          order: index
        }))
      }

      if (goalData.curriculumItems) {
        goalData.curriculumItems = goalData.curriculumItems.map((item: any, index: number) => ({
          ...item,
          id: Date.now().toString() + index,
          order: index
        }))
      }

      // Ensure proper date formatting for Save goals
      if (goalData.category === 'save' && goalData.deadline) {
        goalData.deadline = new Date(goalData.deadline).toISOString()
      }

      // Insert the goal into Supabase
      const { data, error } = await supabaseClient
        .from('goals')
        .insert({
          user_id: user.id,
          title: goalData.title,
          description: goalData.description || '',
          category: goalData.category,
          data: extractGoalData(goalData),
          xp_earned: 0,
        })
        .select()
        .single()

      if (error) {
        console.error('Supabase insert error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to save goal to database' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Transform the goal back to the app format
      const transformedGoal = {
        id: data.id,
        title: data.title,
        description: data.description,
        category: data.category,
        createdAt: new Date(data.created_at),
        completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
        xpEarned: data.xp_earned,
        ...(data.data || {})
      }

      return new Response(
        JSON.stringify({ goal: transformedGoal }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      console.error('AI Response:', aiResponse)
      return new Response(
        JSON.stringify({ error: 'Invalid response format from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Helper function to extract goal-specific data
function extractGoalData(goal: any) {
  const { title, description, category, ...data } = goal
  return data
} 