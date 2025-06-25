import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Home } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { useGuest } from '@/contexts/GuestContext';

interface GuestTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export function GuestTabBar({ state, descriptors, navigation }: GuestTabBarProps) {
  const { setGuestMode } = useGuest();

  const handleCreateAccount = () => {
    setGuestMode(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={styles.homeTab}
          onPress={() => navigation.navigate('index')}
        >
          <Home size={24} color={Colors.primary} />
          <Text style={styles.homeTabText}>Home</Text>
        </TouchableOpacity>
      </View>
      
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
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  homeTab: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  homeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 4,
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