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
    const { goalId, userId, message } = await req.json();

    if (!goalId || !userId || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    // Get user's phone from profiles
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("phone_number")
      .eq("id", userId)
      .single();

    if (profileError || !profile?.phone_number) {
      return new Response(
        JSON.stringify({ error: "User phone number not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Format phone number for WhatsApp
    const toNumber = `whatsapp:${profile.phone_number}`;
    const fromNumber = `whatsapp:${
      Deno.env.get("TWILIO_WHATSAPP_NUMBER") ?? ""
    }`;

    // Get Twilio credentials
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";

    // Send WhatsApp message using Template (required for Business API)
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: toNumber,
          From: fromNumber,
          // Use WhatsApp Message Template - replace with your actual ContentSid after template approval
          ContentSid: "HX8599450e2cb524eb020b50d8157d685c", // Get this from Twilio Console after template approval
          ContentVariables: JSON.stringify({
            "1": message, // This will be inserted into {{1}} in your template
          }),
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("WhatsApp send failed:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send WhatsApp message" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const whatsappResult = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        messageId: whatsappResult.sid,
        status: whatsappResult.status,
        message: "WhatsApp message sent successfully",
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
