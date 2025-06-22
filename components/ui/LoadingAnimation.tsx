import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  interpolate,
  withSequence,
  Easing
} from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';

interface LoadingAnimationProps {
  visible: boolean;
}

export function LoadingAnimation({ visible }: LoadingAnimationProps) {
  const rotation = useSharedValue(0);
  const textGlow = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Fade in the entire component
      opacity.value = withTiming(1, { duration: 300 });
      
      // Start spinner rotation
      rotation.value = withRepeat(
        withTiming(360, { 
          duration: 1500, 
          easing: Easing.linear 
        }),
        -1,
        false
      );
      
      // Start text glow animation
      textGlow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0, { duration: 800 })
        ),
        -1,
        false
      );
    } else {
      opacity.value = withTiming(0, { duration: 300 });
      rotation.value = 0;
      textGlow.value = 0;
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const textStyle = useAnimatedStyle(() => {
    const glowOpacity = interpolate(textGlow.value, [0, 1], [0.6, 1]);
    const scale = interpolate(textGlow.value, [0, 1], [0.98, 1.02]);
    
    return {
      opacity: glowOpacity,
      transform: [{ scale }],
    };
  });

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, containerStyle]}>
      <View style={styles.container}>
        <Animated.View style={[styles.spinner, spinnerStyle]}>
          <View style={styles.spinnerInner} />
        </Animated.View>
        
        <Animated.Text style={[styles.text, textStyle]}>
          Generating your goals...
        </Animated.Text>
        
        <Text style={styles.subtext}>
          Our AI is crafting personalized goals just for you
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    alignItems: 'center',
    padding: 40,
  },
  spinner: {
    width: 60,
    height: 60,
    marginBottom: 24,
  },
  spinnerInner: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    borderWidth: 4,
    borderColor: 'transparent',
    borderTopColor: '#8A2BE2',
    borderRightColor: '#8A2BE2',
    shadowColor: '#8A2BE2',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  text: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8A2BE2',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
    color: Colors.gray600,
    textAlign: 'center',
    lineHeight: 20,
  },
});