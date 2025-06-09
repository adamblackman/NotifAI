import React from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Colors } from '@/constants/Colors';

interface InputProps extends TextInputProps {
  variant?: 'default' | 'large';
}

export function Input({ variant = 'default', style, ...props }: InputProps) {
  return (
    <TextInput
      style={[
        styles.input,
        variant === 'large' && styles.large,
        style
      ]}
      placeholderTextColor={Colors.gray400}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: Colors.white,
  },
  large: {
    paddingVertical: 16,
    fontSize: 18,
  },
});