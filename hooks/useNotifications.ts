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
    console.log("📱 useNotifications hook initialized", {
      isDevice: Device.isDevice,
      user: user ? `User: ${user.id}` : "No user",
      platform: Platform.OS,
    });

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
        console.log("🔔 Notification received:", notification);
        setNotification(notification);
      },
    );

    // Listen for notification responses (user tapped notification)
    const responseListener = Notifications
      .addNotificationResponseReceivedListener((response) => {
        console.log("📱 Notification response:", response);
        const data = response.notification.request.content.data;

        // Handle deep linking based on notification data
        if (data?.goalId) {
          // Navigate to specific goal tracking screen
          // This would be implemented based on your navigation structure
        }
      });

    return () => {
      console.log("🧹 Cleaning up notification listeners");
      notificationListener.remove();
      responseListener.remove();
    };
  }, [user]);

  const checkPermissionStatus = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    console.log("🔐 Current permission status:", status);
    setPermissionStatus(status);
  };

  const requestNotificationPermissions = async (): Promise<{
    granted: boolean;
    token?: string;
  }> => {
    console.log("🔔 Requesting notification permissions...", {
      isDevice: Device.isDevice,
      platform: Platform.OS,
    });

    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
        console.log("📱 Android notification channel set up");
      }

      if (!Device.isDevice) {
        console.warn(
          "⚠️ Push notifications require a physical device! You're using:",
          Device.isDevice ? "Physical Device" : "Simulator/Emulator",
        );
        console.log(
          "📱 To test notifications: Use a physical iPhone/Android device",
        );
        return { granted: false };
      }

      const { status: existingStatus } = await Notifications
        .getPermissionsAsync();
      console.log("🔐 Existing permission status:", existingStatus);
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        console.log("🔔 Requesting permissions...");
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log("✅ Permission request result:", status);
      }

      setPermissionStatus(finalStatus);

      if (finalStatus !== "granted") {
        console.warn("❌ Permission denied:", finalStatus);
        return { granted: false };
      }

      try {
        console.log("🔑 Getting Expo push token...");
        const pushTokenData = await Notifications.getExpoPushTokenAsync();
        const token = pushTokenData.data;
        console.log("✅ Push token obtained:", token?.substring(0, 20) + "...");

        setExpoPushToken(token);

        // Save token if user is logged in
        if (user) {
          console.log("💾 Saving token to database for user:", user.id);
          await saveTokenToDatabase(token);
        } else {
          console.log("⚠️ No user logged in, token not saved yet");
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
    console.log("🔄 Auto-registering for push notifications...");

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
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
        console.log("❌ Auto-registration failed: permission not granted");
        return null;
      }

      try {
        const pushTokenData = await Notifications.getExpoPushTokenAsync();
        token = pushTokenData.data;
        console.log("✅ Auto-registration successful, token obtained");
      } catch (error) {
        console.error("❌ Error in auto-registration:", error);
      }
    } else {
      console.log("⚠️ Auto-registration skipped: simulator detected");
    }

    return token;
  };

  const saveTokenToDatabase = async (token: string) => {
    if (!user) {
      console.log("⚠️ No user available for saving token");
      return;
    }

    console.log("💾 Attempting to save token to database...", {
      userId: user.id,
      tokenPreview: token.substring(0, 20) + "...",
    });

    try {
      const { error } = await supabase
        .from("device_tokens")
        .upsert(
          { user_id: user.id, token },
          { onConflict: "user_id" },
        );

      if (error) {
        console.error("❌ Error saving push token:", error);
      } else {
        console.log("✅ Push token saved successfully to Supabase!");
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
