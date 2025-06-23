import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Image, TouchableOpacity, Linking } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';

export function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleAuth = async () => {
    if (!email.trim() || !password.trim() || (isSignUp && !confirmPassword.trim())) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
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

  const handleBoltLogoPress = () => {
    Linking.openURL('https://bolt.new/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.spacer} />
        <TouchableOpacity onPress={handleBoltLogoPress}>
          <Image 
            source={require('@/assets/images/white_circle_360x360.png')} 
            style={styles.boltLogo}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Image 
          source={require('@/assets/images/Logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.subtitle}>
          Your AI-powered buddy to remind you anything you need right when you need it
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
            secureTextEntry={!isPasswordVisible}
            style={styles.input}
            icon={isPasswordVisible ? 'eye-off' : 'eye'}
            onIconPress={() => setIsPasswordVisible(!isPasswordVisible)}
          />
          
          {isSignUp && (
            <Input
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!isConfirmPasswordVisible}
              style={styles.input}
              icon={isConfirmPasswordVisible ? 'eye-off' : 'eye'}
              onIconPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
            />
          )}
          
          <Button
            title={loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            onPress={handleAuth}
            disabled={loading}
            style={styles.authButton}
          />
          
          <Button
            title={isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            onPress={() => {
              setIsSignUp(!isSignUp);
              setPassword('');
              setConfirmPassword('');
              setIsPasswordVisible(false);
              setIsConfirmPasswordVisible(false);
            }}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  spacer: {
    flex: 1,
  },
  boltLogo: {
    height: 32,
    width: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    alignItems: 'center',
  },
  logo: {
    height: 80,
    width: 240,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.gray600,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    maxWidth: 300,
  },
  card: {
    padding: 24,
    width: '100%',
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