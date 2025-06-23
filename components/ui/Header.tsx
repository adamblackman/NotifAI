import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Colors } from '@/constants/Colors';

interface HeaderProps {
  showLogo?: boolean;
}

export function Header({ showLogo = true }: HeaderProps) {
  const handleBoltLogoPress = () => {
    Linking.openURL('https://bolt.new/');
  };

  return (
    <View style={styles.container}>
      {showLogo && (
        <Image 
          source={require('@/assets/images/Logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      )}
      <View style={styles.spacer} />
      <TouchableOpacity onPress={handleBoltLogoPress}>
        <Image 
          source={require('@/assets/images/white_circle_360x360.png')} 
          style={styles.boltLogo}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  logo: {
    height: 40,
    width: 120,
  },
  spacer: {
    flex: 1,
  },
  boltLogo: {
    height: 32,
    width: 32,
  },
});