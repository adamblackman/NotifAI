import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { GuestProvider, useGuest } from '@/contexts/GuestContext';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { NotificationBanner } from '@/components/ui/NotificationBanner';
import { useNotifications } from '@/hooks/useNotifications';
import { router } from 'expo-router';

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const { isGuestMode } = useGuest();
  const { notification, permissionStatus, requestNotificationPermissions } = useNotifications();
  const [currentNotification, setCurrentNotification] = useState<any>(null);

  // Check if user needs notification setup after authentication
  useEffect(() => {
    if (user && permissionStatus === 'undetermined') {
      // Small delay to let the main UI load first
      setTimeout(() => {
        requestNotificationPermissions();
      }, 2000);
    }
  }, [user, permissionStatus]);

  useEffect(() => {
    if (notification) {
      setCurrentNotification(notification);
    }
  }, [notification]);

  const handleNotificationPress = (data?: any) => {
    if (data?.goalId) {
      // Navigate to the goal's tracking screen
      const category = data.category;
      if (category) {
        router.push(`/tracking/${category}?goalId=${data.goalId}`);
      }
    }
  };

  const handleNotificationDismiss = () => {
    setCurrentNotification(null);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user && !isGuestMode) {
    return <AuthScreen />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="create-goal/index" options={{ presentation: 'modal' }} />
        <Stack.Screen name="tracking/[category]" options={{ headerShown: true }} />
        <Stack.Screen name="achievements/[category]" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
      
      {/* In-app notification banner (only for authenticated users) */}
      {user && (
        <NotificationBanner
          notification={currentNotification}
          onDismiss={handleNotificationDismiss}
          onPress={handleNotificationPress}
        />
      )}
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <GuestProvider>
        <AuthenticatedLayout />
      </GuestProvider>
    </AuthProvider>
  );
}