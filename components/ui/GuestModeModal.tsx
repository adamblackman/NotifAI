import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { X, UserPlus } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Button } from '@/components/ui/Button';
import { useGuest } from '@/contexts/GuestContext';

interface GuestModeModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateAccount: () => void;
}

export function GuestModeModal({ visible, onClose, onCreateAccount }: GuestModeModalProps) {
  const { setShowSignUp } = useGuest();
  
  const handleCreateAccount = () => {
    setShowSignUp(true);
    onCreateAccount();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <UserPlus size={24} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Create Account for AI Goals</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.gray600} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.message}>
              You've already used your one-time AI goal generation as a guest. 
              Create an account to unlock unlimited AI-powered goal creation and get personalized notifications!
            </Text>
            
            <View style={styles.featureList}>
              <Text style={styles.featureItem}>✨ Unlimited AI goal generation</Text>
              <Text style={styles.featureItem}>🔔 Smart notifications and reminders</Text>
              <Text style={styles.featureItem}>📊 Progress tracking and analytics</Text>
              <Text style={styles.featureItem}>🏆 Achievement system and rewards</Text>
              <Text style={styles.featureItem}>☁️ Cloud sync across devices</Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="Maybe Later"
              onPress={onClose}
              variant="outline"
              style={styles.button}
            />
            <Button
              title="Create Account"
              onPress={handleCreateAccount}
              style={styles.button}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.gray900,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    marginBottom: 24,
  },
  message: {
    fontSize: 16,
    color: Colors.gray700,
    lineHeight: 22,
    marginBottom: 20,
  },
  featureList: {
    gap: 8,
  },
  featureItem: {
    fontSize: 14,
    color: Colors.gray600,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingHorizontal: 16, // Reduced from default 24px to fit text on one line
  },
});