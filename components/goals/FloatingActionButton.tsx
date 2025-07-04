import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withSequence 
} from 'react-native-reanimated';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface FloatingActionButtonProps {
  onPress: () => void;
  isGuestMode?: boolean;
}

export function FloatingActionButton({ onPress, isGuestMode = false }: FloatingActionButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.95, { duration: 100 }),
      withSpring(1, { duration: 100 })
    );
    onPress();
  };

  return (
    <AnimatedTouchableOpacity
      style={[
        styles.fab, 
        isGuestMode ? styles.fabGuest : styles.fabNormal,
        animatedStyle
      ]}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <Plus size={24} color={Colors.white} />
    </AnimatedTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 24,
    backgroundColor: Colors.primary,
    borderRadius: 28,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  fabNormal: {
    bottom: 80, // Normal position for authenticated users
  },
  fabGuest: {
    bottom: 20, // Positioned just above the guest "Create account" button
  },
});