import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Button } from '@/components/ui/Button';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmStyle?: 'default' | 'destructive';
}

export function ConfirmationModal({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  confirmStyle = 'default'
}: ConfirmationModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Message */}
          <View style={styles.messageSection}>
            <Text style={styles.message}>{message}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              title={cancelText}
              onPress={onCancel}
              variant="outline"
              style={styles.button}
            />
            <Button
              title={confirmText}
              onPress={onConfirm}
              style={confirmStyle === 'destructive' ? styles.destructiveButton : styles.button}
              textStyle={confirmStyle === 'destructive' ? styles.destructiveButtonText : undefined}
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
    minWidth: 300,
    // Web-specific styles
    ...(Platform.OS === 'web' && {
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.gray800,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  messageSection: {
    marginBottom: 24,
  },
  message: {
    fontSize: 16,
    color: Colors.gray600,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
  },
  destructiveButton: {
    flex: 1,
    backgroundColor: '#ef4444',
  },
  destructiveButtonText: {
    color: Colors.white,
  },
}); 