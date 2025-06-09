import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "./supabase";

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// Register notification categories with actions
const registerNotificationCategories = async () => {
    if (Platform.OS === "ios") {
        await Notifications.setNotificationCategoryAsync("HABIT_REMINDER", [
            {
                identifier: "COMPLETE_HABIT",
                buttonTitle: "✅ Mark Complete",
                options: {
                    opensAppToForeground: false,
                },
            },
            {
                identifier: "VIEW_GOAL",
                buttonTitle: "👀 View Goal",
                options: {
                    opensAppToForeground: true,
                },
            },
        ]);

        await Notifications.setNotificationCategoryAsync("PROJECT_REMINDER", [
            {
                identifier: "COMPLETE_TASK",
                buttonTitle: "✅ Complete Task",
                options: {
                    opensAppToForeground: false,
                },
            },
            {
                identifier: "VIEW_GOAL",
                buttonTitle: "👀 View Project",
                options: {
                    opensAppToForeground: true,
                },
            },
        ]);

        await Notifications.setNotificationCategoryAsync("LEARN_REMINDER", [
            {
                identifier: "MARK_STUDIED",
                buttonTitle: "📚 Mark Studied",
                options: {
                    opensAppToForeground: false,
                },
            },
            {
                identifier: "VIEW_GOAL",
                buttonTitle: "👀 View Lesson",
                options: {
                    opensAppToForeground: true,
                },
            },
        ]);

        await Notifications.setNotificationCategoryAsync("SAVE_REMINDER", [
            {
                identifier: "LOG_SAVINGS",
                buttonTitle: "💰 Log Savings",
                options: {
                    opensAppToForeground: true,
                },
            },
            {
                identifier: "VIEW_GOAL",
                buttonTitle: "📊 View Progress",
                options: {
                    opensAppToForeground: true,
                },
            },
        ]);
    }
};

// Request notification permissions
export async function requestNotificationPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
        console.log("Must use physical device for Push Notifications");
        return false;
    }

    const { status: existingStatus } = await Notifications
        .getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== "granted") {
        console.log("Failed to get push token for push notification!");
        return false;
    }

    return true;
}

// Register push token with Supabase
export async function registerPushToken(): Promise<string | null> {
    try {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) {
            return null;
        }

        // Register notification categories
        await registerNotificationCategories();

        // Get the push token
        const token = (await Notifications.getExpoPushTokenAsync({
            projectId: "e44b8c07-b734-4113-97ed-7421a0e6c91a",
        })).data;

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("User not authenticated");
        }

        // Save token to Supabase
        const { error } = await supabase
            .from("user_push_tokens")
            .upsert({
                user_id: user.id,
                expo_push_token: token,
                is_active: true,
                updated_at: new Date().toISOString(),
            });

        if (error) {
            console.error("Error saving push token:", error);
            return null;
        }

        console.log("Push token registered successfully:", token);
        return token;
    } catch (error) {
        console.error("Error registering push token:", error);
        return null;
    }
}

// Deactivate push token (for logout)
export async function deactivatePushToken(): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const token = (await Notifications.getExpoPushTokenAsync({
            projectId: "e44b8c07-b734-4113-97ed-7421a0e6c91a",
        })).data;

        await supabase
            .from("user_push_tokens")
            .update({ is_active: false })
            .eq("user_id", user.id)
            .eq("expo_push_token", token);
    } catch (error) {
        console.error("Error deactivating push token:", error);
    }
}

// Initialize notification service
export async function initializeNotificationService(): Promise<void> {
    try {
        await registerPushToken();
    } catch (error) {
        console.error("Error initializing notification service:", error);
    }
}
