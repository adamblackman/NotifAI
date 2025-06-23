import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Image, TouchableOpacity, Linking, Modal } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';

export function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);
  const { signIn, signUp, setupNotificationsForNewUser } = useAuth();
  const { requestNotificationPermissions } = useNotifications();

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
      const { data, error } = isSignUp 
        ? await signUp(email.trim(), password)
        : await signIn(email.trim(), password);

      if (error) {
        console.error("❌ Auth error:", error);
        Alert.alert('Error', error.message);
      } else if (isSignUp && data?.user) {
        // For new signups, show notification permission modal
        setNewUserId(data.user.id);
        setShowNotificationModal(true);
      } else if (!isSignUp && data?.user) {
      }
    } catch (error) {
      console.error("❌ Auth exception:", error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationPermission = async (allowNotifications: boolean) => {
    
    if (allowNotifications && newUserId) {
      try {
        const { granted, token } = await requestNotificationPermissions();
        
        if (granted && token) {
          await setupNotificationsForNewUser(newUserId, token);
        } else {
        }
      } catch (error) {
        console.error('❌ Error setting up notifications:', error);
      }
    } else {
    }
    
    setShowNotificationModal(false);
    setNewUserId(null);
  };

  const handleBoltLogoPress = () => {
    Linking.openURL('https://bolt.new/');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleBoltLogoPress} style={styles.boltLogoContainer}>
        <Image 
          source={require('@/assets/images/white_circle_360x360.png')} 
          style={styles.boltLogo}
          resizeMode="contain"
        />
      </TouchableOpacity>

      <View style={styles.centeredContent}>
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

      {/* Notification Permission Modal */}
      <Modal
        visible={showNotificationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => handleNotificationPermission(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔔 Enable Notifications</Text>
            <Text style={styles.modalMessage}>
              NotifAI can send you personalized reminders to help you stay on track with your goals. 
              {'\n\n'}Would you like to receive notifications?
            </Text>
            
            <View style={styles.modalButtons}>
              <Button
                title="Not Now"
                onPress={() => handleNotificationPermission(false)}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title="Allow Notifications"
                onPress={() => handleNotificationPermission(true)}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  boltLogoContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
  },
  boltLogo: {
    height: 80,
    width: 80,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    alignItems: 'center',
  },
  logo: {
    height: 60,
    width: 180,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: Colors.gray900,
  },
  modalMessage: {
    fontSize: 16,
    color: Colors.gray600,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});