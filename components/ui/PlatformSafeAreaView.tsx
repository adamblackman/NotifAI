import React from 'react';
import { Platform, View, SafeAreaView, ViewStyle } from 'react-native';

interface PlatformSafeAreaViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function PlatformSafeAreaView({ children, style }: PlatformSafeAreaViewProps) {
  if (Platform.OS === 'web') {
    // On web, use regular View since there's no concept of safe area
    return <View style={[{ flex: 1 }, style]}>{children}</View>;
  }

  // On mobile platforms, use SafeAreaView
  return <SafeAreaView style={[{ flex: 1 }, style]}>{children}</SafeAreaView>;
} 