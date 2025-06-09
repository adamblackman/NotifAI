import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuth } from '@/hooks/useAuth';
import { AuthScreen } from '@/components/auth/AuthScreen';

export default function RootLayout() {
  useFrameworkReady();
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="create-goal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="tracking" options={{ headerShown: true }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}