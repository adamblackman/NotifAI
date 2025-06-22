import React from 'react';
import { View, TextInput, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  variant?: 'default' | 'large';
  icon?: React.ComponentProps<typeof Feather>['name'];
  onIconPress?: () => void;
  containerStyle?: any;
}

export function Input({ variant = 'default', style, icon, onIconPress, containerStyle, ...props }: InputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        style={[
          styles.input,
          variant === 'large' && styles.large,
          icon ? styles.inputWithIcon : {},
          style
        ]}
        placeholderTextColor={Colors.gray400}
        {...props}
      />
      {icon && (
        <TouchableOpacity onPress={onIconPress} style={styles.iconContainer}>
          <Feather name={icon} size={18} color={Colors.gray400} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    width: '100%',
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: Colors.white,
  },
  inputWithIcon: {
    paddingRight: 45, // Make space for the icon
  },
  iconContainer: {
    position: 'absolute',
    right: 0,
    top: -8,
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 0,
  },
  large: {
    paddingVertical: 16,
    fontSize: 18,
  },
});