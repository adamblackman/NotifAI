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

    // Get pending notifications that should be sent now
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    const { data: pendingNotifications, error: fetchError } =
      await supabaseClient
        .from("scheduled_notifications")
        .select(`
        id,
        user_id,
        goal_id,
        message,
        scheduled_at,
        channel,
        goals(title, category)
      `)
        .eq("status", "pending")
        .lte("scheduled_at", fiveMinutesFromNow.toISOString());

    if (fetchError) {
      console.error("Error fetching pending notifications:", fetchError);
      throw fetchError;
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sentCount: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let sentCount = 0;
    let failedCount = 0;

    // Group notifications by channel type
    const notificationsByChannel = pendingNotifications.reduce(
      (acc, notification) => {
        const channel = notification.channel || "push";
        if (!acc[channel]) {
          acc[channel] = [];
        }
        acc[channel].push(notification);
        return acc;
      },
      {} as Record<string, any[]>,
    );

    // Process each channel type
    for (
      const [channel, notifications] of Object.entries(notificationsByChannel)
    ) {
      for (const notification of notifications) {
        try {
          let success = false;

          switch (channel) {
            case "push":
              success = await sendPushNotification(
                supabaseClient,
                notification,
              );
              break;
            case "whatsapp":
              success = await sendWhatsAppNotification(
                supabaseClient,
                notification,
              );
              break;
            default:
              console.warn(`Unknown notification channel: ${channel}`);
              success = false;
          }

          if (success) {
            sentCount++;
          } else {
            failedCount++;
          }
        } catch (error) {
          console.error(
            `Error sending notification ${notification.id}:`,
            error,
          );
          failedCount++;

          // Mark as failed in database
          await supabaseClient
            .from("scheduled_notifications")
            .update({
              status: "failed",
              sent_at: new Date().toISOString(),
            })
            .eq("id", notification.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sentCount,
        failedCount,
        totalProcessed: pendingNotifications.length,
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

async function sendPushNotification(
  supabaseClient: any,
  notification: any,
): Promise<boolean> {
  try {
    // Get user's device token
    const { data: deviceTokens, error: tokenError } = await supabaseClient
      .from("device_tokens")
      .select("token")
      .eq("user_id", notification.user_id);

    if (tokenError) {
      console.error(
        `Error fetching device token for user ${notification.user_id}:`,
        tokenError,
      );
      return false;
    }

    if (!deviceTokens || deviceTokens.length === 0) {
      // Mark as failed - no device token
      await supabaseClient
        .from("scheduled_notifications")
        .update({
          status: "failed",
          sent_at: new Date().toISOString(),
        })
        .eq("id", notification.id);
      return false;
    }

    // Prepare push notification payload
    const pushToken = deviceTokens[0].token;
    const goalTitle = notification.goals?.title || "Your Goal";

    const pushPayload = {
      to: pushToken,
      title: goalTitle,
      body: notification.message,
      data: {
        goalId: notification.goal_id,
        notificationId: notification.id,
        category: notification.goals?.category,
        userId: notification.user_id,
      },
      sound: "default",
      categoryId: "GOAL_COMPLETION",
      actions: [
        {
          identifier: "COMPLETE_ACTION",
          title: "Complete",
          options: ["foreground"],
        },
      ],
    };

    // Send to Expo Push API
    const expoPushResponse = await fetch(
      "https://exp.host/--/api/v2/push/send",
      {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pushPayload),
      },
    );

    const expoPushResult = await expoPushResponse.json();

    if (
      expoPushResponse.ok && expoPushResult.data &&
      expoPushResult.data.status === "ok"
    ) {
      // Mark as sent
      await supabaseClient
        .from("scheduled_notifications")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", notification.id);

      return true;
    } else {
      console.error(
        `Expo push failed for notification ${notification.id}:`,
        expoPushResult,
      );

      // Mark as failed
      await supabaseClient
        .from("scheduled_notifications")
        .update({
          status: "failed",
          sent_at: new Date().toISOString(),
        })
        .eq("id", notification.id);

      return false;
    }
  } catch (error) {
    console.error(
      `Error in sendPushNotification for ${notification.id}:`,
      error,
    );
    return false;
  }
}

async function sendWhatsAppNotification(
  supabaseClient: any,
  notification: any,
): Promise<boolean> {
  try {
    // Call the WhatsApp notification edge function
    const whatsappResponse = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-whatsapp-notification`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
          }`,
        },
        body: JSON.stringify({
          goalId: notification.goal_id,
          userId: notification.user_id,
          message: notification.message,
        }),
      },
    );

    if (whatsappResponse.ok) {
      // Mark as sent
      await supabaseClient
        .from("scheduled_notifications")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", notification.id);

      return true;
    } else {
      const errorText = await whatsappResponse.text();
      console.error(
        `WhatsApp send failed for notification ${notification.id}:`,
        errorText,
      );

      // Mark as failed
      await supabaseClient
        .from("scheduled_notifications")
        .update({
          status: "failed",
          sent_at: new Date().toISOString(),
        })
        .eq("id", notification.id);

      return false;
    }
  } catch (error) {
    console.error(
      `Error in sendWhatsAppNotification for ${notification.id}:`,
      error,
    );
    return false;
  }
}
