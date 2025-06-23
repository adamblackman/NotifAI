import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Linking, StatusBar } from 'react-native';
import { Colors } from '@/constants/Colors';

interface HeaderProps {
  showLogo?: boolean;
}

export function Header({ showLogo = true }: HeaderProps) {
  const handleBoltLogoPress = () => {
    Linking.openURL('https://bolt.new/');
  };

  return (
    <>
      <StatusBar backgroundColor={Colors.white} barStyle="dark-content" />
      <View style={styles.container}>
        {showLogo && (
          <Image 
            source={require('@/assets/images/Logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        )}
        <View style={styles.spacer} />
        <TouchableOpacity onPress={handleBoltLogoPress} style={styles.boltLogoContainer}>
          <Image 
            source={require('@/assets/images/white_circle_360x360.png')} 
            style={styles.boltLogo}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  boltLogoContainer: {
    padding: 4,
  },
  boltLogo: {
    height: 48,
    width: 48,
  },
});