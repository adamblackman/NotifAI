import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { initializeNotificationService } from '@/lib/notificationService';
import { handleNotificationAction } from '@/lib/notificationActions';

function AuthenticatedLayout() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user) {
      // Initialize notifications when user is authenticated
      initializeNotificationService();

      // Set up notification action listener
      const subscription = Notifications.addNotificationResponseReceivedListener(handleNotificationAction);

      return () => subscription.remove();
    }
  }, [user]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="create-goal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="tracking/[category]" options={{ headerShown: true }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <AuthenticatedLayout />
    </AuthProvider>
  );
}