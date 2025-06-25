import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useGuest } from '@/contexts/GuestContext';

interface GuestTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export function GuestTabBar({ state, descriptors, navigation }: GuestTabBarProps) {
  const { setGuestMode, setShowSignUp } = useGuest();

  const handleCreateAccount = () => {
    setShowSignUp(true);
    setGuestMode(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.ctaButton} onPress={handleCreateAccount}>
        <Text style={styles.ctaButtonText}>Create an account for full functionality</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  ctaButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});