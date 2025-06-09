import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  Easing 
} from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';

interface ProgressBarProps {
  progress: number; // 0-100
  height?: number;
  color?: string;
  backgroundColor?: string;
  animated?: boolean;
}

export function ProgressBar({ 
  progress, 
  height = 8,
  color = Colors.primary,
  backgroundColor = Colors.gray200,
  animated = true 
}: ProgressBarProps) {
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      animatedWidth.value = withTiming(progress, {
        duration: 1000,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      animatedWidth.value = progress;
    }
  }, [progress, animated]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${animatedWidth.value}%`,
    };
  });

  return (
    <View style={[styles.container, { height, backgroundColor }]}>
      <Animated.View 
        style={[
          styles.progress, 
          { backgroundColor: color, height },
          animatedStyle
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  progress: {
    borderRadius: 4,
  },
});