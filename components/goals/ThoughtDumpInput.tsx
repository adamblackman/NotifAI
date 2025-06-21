import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';

interface ThoughtDumpInputProps {
  onSubmit: (thought: string) => void;
  loading?: boolean;
}

export function ThoughtDumpInput({ onSubmit, loading = false }: ThoughtDumpInputProps) {
  const [thought, setThought] = useState('');

  const handleSubmit = () => {
    if (thought.trim() && !loading) {
      onSubmit(thought.trim());
      setThought('');
    }
  };

  return (
    <View style={styles.container}>
      <Input
        placeholder="What would you like to achieve? Describe your goals... (e.g., 'I want to exercise daily, learn Spanish, and save for a vacation')"
        value={thought}
        onChangeText={setThought}
        multiline
        numberOfLines={3}
        style={styles.input}
        variant="large"
      />
      <Button
        title={loading ? "Generating..." : "Generate Goals"}
        onPress={handleSubmit}
        disabled={!thought.trim() || loading}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 16,
    margin: 16,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  input: {
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  button: {
    width: '100%',
  },
});