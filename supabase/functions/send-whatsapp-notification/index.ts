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

    // Get user's phone from preferences
    const { data: preferences, error: prefError } = await supabaseClient
      .from("preferences")
      .select("phone")
      .eq("user_id", userId)
      .single();

    if (prefError || !preferences?.phone) {
      return new Response(
        JSON.stringify({ error: "User phone number not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Format phone number for WhatsApp
    const toNumber = `whatsapp:${preferences.phone}`;
    const fromNumber = `whatsapp:${Deno.env.get("TWILIO_WHATSAPP_NUMBER") ?? ""}`;

    // Prepare form data for Twilio
    const formData = new URLSearchParams();
    formData.append("To", toNumber);
    formData.append("From", fromNumber);
    formData.append("Body", message);

    // Send WhatsApp message via Pica Twilio API
    const whatsappResponse = await fetch(
      `https://api.picaos.com/v1/passthrough/Accounts/${Deno.env.get("TWILIO_ACCOUNT_SID")}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
          "x-pica-secret": Deno.env.get("PICA_SECRET_KEY") ?? "",
          "x-pica-connection-key": Deno.env.get("PICA_TWILIO_CONNECTION_KEY") ?? "",
          "x-pica-action-id": "conn_mod_def::GC7N3zbeE28::A5b41eniS62szBc_-AiXBA",
        },
        body: formData.toString(),
      },
    );

    if (!whatsappResponse.ok) {
      const errorText = await whatsappResponse.text();
      console.error("WhatsApp send failed:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send WhatsApp message" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const whatsappResult = await whatsappResponse.json();

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