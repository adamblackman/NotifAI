import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';

export function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = isSignUp 
        ? await signUp(email.trim(), password)
        : await signIn(email.trim(), password);

      if (error) {
        Alert.alert('Error', error.message);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Goal Companion</Text>
        <Text style={styles.subtitle}>
          Your AI-powered habit and goal tracking companion
        </Text>

        <Card style={styles.card}>
          <Input
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />
          
          <Input
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />
          
          <Button
            title={loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            onPress={handleAuth}
            disabled={loading}
            style={styles.authButton}
          />
          
          <Button
            title={isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            onPress={() => setIsSignUp(!isSignUp)}
            variant="outline"
            style={styles.switchButton}
          />
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.gray800,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.gray600,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  card: {
    padding: 24,
  },
  input: {
    marginBottom: 16,
  },
  authButton: {
    marginBottom: 12,
  },
  switchButton: {
    marginTop: 8,
  },
});