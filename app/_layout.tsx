import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { NotificationBanner } from '@/components/ui/NotificationBanner';
import { useNotifications } from '@/hooks/useNotifications';
import { router } from 'expo-router';

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const { notification } = useNotifications();
  const [currentNotification, setCurrentNotification] = useState<any>(null);

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

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="create-goal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="tracking/[category]" options={{ headerShown: true }} />
        <Stack.Screen name="achievements/[category]" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
      
      {/* In-app notification banner */}
      <NotificationBanner
        notification={currentNotification}
        onDismiss={handleNotificationDismiss}
        onPress={handleNotificationPress}
      />
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