import { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
} as any);

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<
    Notifications.Notification | null
  >(null);
  const [permissionStatus, setPermissionStatus] = useState<string>(
    "undetermined",
  );
  const { user } = useAuth();

  useEffect(() => {
    // Check current permission status
    checkPermissionStatus();

    if (user) {
      // Only try to register if we have permissions
      registerForPushNotificationsAsync().then((token) => {
        if (token) {
          setExpoPushToken(token);
          saveTokenToDatabase(token);
        }
      });
    }

    // Listen for notifications received while app is in foreground
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        setNotification(notification);
      },
    );

    // Listen for notification responses (user tapped notification)
    const responseListener = Notifications
      .addNotificationResponseReceivedListener(async (response) => {
        const data = response.notification.request.content.data;
        const actionIdentifier = response.actionIdentifier;

        // Handle completion action
        if (
          actionIdentifier === "COMPLETE_ACTION" && data?.goalId &&
          data?.category && data?.userId
        ) {
          try {
            const completionResponse = await fetch(
              "https://uhnvncqogcfgkdhlvmzq.supabase.co/functions/v1/complete-goal-action",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization":
                    `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnZuY3FvZ2NmZ2tkaGx2bXpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4MjE3NDAsImV4cCI6MjA2NDM5Nzc0MH0.rYRstoYB-yfg9N8SxmZPaSGQg9lA4iCkGEF6raoQ2CQ`,
                },
                body: JSON.stringify({
                  goalId: data.goalId,
                  userId: data.userId,
                  category: data.category,
                }),
              },
            );

            const result = await completionResponse.json();

            if (result.success) {
              // Show a success notification
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: "Success!",
                  body: result.message,
                  sound: "default",
                },
                trigger: null, // Show immediately
              });
            } else {
              console.error("Failed to complete goal action:", result.error);
            }
          } catch (error) {
            console.error("Error calling completion function:", error);
          }
        }

        // Handle deep linking based on notification data
        if (data?.goalId) {
          // Navigate to specific goal tracking screen
          // This would be implemented based on your navigation structure
        }
      });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, [user]);

  const checkPermissionStatus = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);
  };

  const requestNotificationPermissions = async (): Promise<{
    granted: boolean;
    token?: string;
  }> => {
    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
          showBadge: false,
        });
      }

      if (Platform.OS === "ios") {
        // Register notification categories for interactive notifications
        await Notifications.setNotificationCategoryAsync("GOAL_COMPLETION", [
          {
            identifier: "COMPLETE_ACTION",
            buttonTitle: "Complete",
            options: {
              opensAppToForeground: true,
            },
          },
        ]);
      }

      if (!Device.isDevice) {
        console.warn(
          "⚠️ Push notifications require a physical device! You're using:",
          Device.isDevice ? "Physical Device" : "Simulator/Emulator",
        );
        return { granted: false };
      }

      const { status: existingStatus } = await Notifications
        .getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      setPermissionStatus(finalStatus);

      if (finalStatus !== "granted") {
        console.warn("❌ Permission denied:", finalStatus);
        return { granted: false };
      }

      try {
        const pushTokenData = await Notifications.getExpoPushTokenAsync();
        const token = pushTokenData.data;

        setExpoPushToken(token);

        // Save token if user is logged in
        if (user) {
          await saveTokenToDatabase(token);
        } else {
        }

        return { granted: true, token };
      } catch (error) {
        console.error("❌ Error getting push token:", error);
        return { granted: true }; // Permission granted but token failed
      }
    } catch (error) {
      console.error("❌ Error requesting notification permissions:", error);
      return { granted: false };
    }
  };

  const registerForPushNotificationsAsync = async (): Promise<
    string | null
  > => {
    let token = null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
        showBadge: false,
      });
    }

    if (Platform.OS === "ios") {
      // Register notification categories for interactive notifications
      await Notifications.setNotificationCategoryAsync("GOAL_COMPLETION", [
        {
          identifier: "COMPLETE_ACTION",
          buttonTitle: "Complete",
          options: {
            opensAppToForeground: true,
          },
        },
      ]);
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications
        .getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      setPermissionStatus(finalStatus);

      if (finalStatus !== "granted") {
        return null;
      }

      try {
        const pushTokenData = await Notifications.getExpoPushTokenAsync();
        token = pushTokenData.data;
      } catch (error) {
        console.error("❌ Error in auto-registration:", error);
      }
    } else {
    }

    return token;
  };

  const saveTokenToDatabase = async (token: string) => {
    if (!user) {
      return;
    }

    try {
      const { error } = await supabase
        .from("device_tokens")
        .upsert(
          { user_id: user.id, token },
          { onConflict: "token" },
        );

      if (error) {
        console.error("❌ Error saving push token:", error);
      } else {
      }
    } catch (error) {
      console.error("❌ Exception saving push token:", error);
    }
  };

  return {
    expoPushToken,
    notification,
    permissionStatus,
    requestNotificationPermissions,
    checkPermissionStatus,
  };
}
