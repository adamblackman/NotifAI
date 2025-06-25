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
        // Get the authorization header
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Missing authorization header" }),
                {
                    status: 401,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        // Create Supabase client with service role key for admin operations
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            },
        );

        // Create regular client to verify the user's token
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        );

        // Verify the user's session
        const { data: { user }, error: authError } = await supabaseClient.auth
            .getUser(
                authHeader.replace("Bearer ", ""),
            );

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: "Invalid or expired token" }),
                {
                    status: 401,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        console.log(`🗑️ Deleting user: ${user.id}`);

        // Delete the user from Supabase Auth using admin privileges
        const { error: deleteError } = await supabaseAdmin.auth.admin
            .deleteUser(
                user.id,
                false, // shouldSoftDelete - set to false for hard deletion
            );

        if (deleteError) {
            console.error("Error deleting user from auth:", deleteError);
            return new Response(
                JSON.stringify({
                    error: "Failed to delete user from authentication system",
                    details: deleteError.message,
                }),
                {
                    status: 500,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        console.log(`✅ Successfully deleted user: ${user.id}`);

        return new Response(
            JSON.stringify({
                message: "User successfully deleted from authentication system",
                userId: user.id,
            }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
        );
    } catch (error) {
        console.error("Error in delete-user function:", error);
        return new Response(
            JSON.stringify({
                error: "Internal server error",
                details: error instanceof Error
                    ? error.message
                    : "Unknown error",
            }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
        );
    }
});
