import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { X, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Button } from '@/components/ui/Button';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
}

export function DeleteAccountModal({ visible, onClose, onConfirm, loading }: DeleteAccountModalProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const isConfirmationValid = confirmationText === 'DELETE';

  const handleConfirm = async () => {
    if (!isConfirmationValid) {
      Alert.alert('Error', 'Please type "DELETE" to confirm account deletion.');
      return;
    }
    
    try {
      await onConfirm();
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setConfirmationText('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.warningIconContainer}>
              <AlertTriangle size={24} color={Colors.error} />
            </View>
            <Text style={styles.title}>Delete Account</Text>
            {!loading && (
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <X size={24} color={Colors.gray600} />
              </TouchableOpacity>
            )}
          </View>

          {/* Warning Message */}
          <View style={styles.warningSection}>
            <Text style={styles.warningTitle}>⚠️ This action cannot be undone</Text>
            <Text style={styles.warningText}>
              Deleting your account will permanently remove all of your data from our servers. 
              This action is irreversible and cannot be undone.
            </Text>
          </View>

          {/* Data List */}
          <View style={styles.dataSection}>
            <Text style={styles.dataTitle}>The following data will be permanently deleted:</Text>
            <View style={styles.dataList}>
              <Text style={styles.dataItem}>• Your profile and account information</Text>
              <Text style={styles.dataItem}>• All goals and progress tracking data</Text>
              <Text style={styles.dataItem}>• Habit streaks and completion history</Text>
              <Text style={styles.dataItem}>• Project tasks and milestones</Text>
              <Text style={styles.dataItem}>• Learning curriculum and progress</Text>
              <Text style={styles.dataItem}>• Savings goals and tracking data</Text>
              <Text style={styles.dataItem}>• XP, levels, and achievement medals</Text>
              <Text style={styles.dataItem}>• Notification preferences and settings</Text>
              <Text style={styles.dataItem}>• Device tokens and notification history</Text>
            </View>
          </View>

          {/* Confirmation Input */}
          <View style={styles.confirmationSection}>
            <Text style={styles.confirmationLabel}>
              To confirm deletion, type <Text style={styles.deleteText}>DELETE</Text> below:
            </Text>
            <TextInput
              style={[
                styles.confirmationInput,
                isConfirmationValid && styles.confirmationInputValid,
                loading && styles.confirmationInputDisabled
              ]}
              value={confirmationText}
              onChangeText={setConfirmationText}
              placeholder="Type DELETE here"
              placeholderTextColor={Colors.gray400}
              autoCapitalize="characters"
              editable={!loading}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              title="Cancel"
              onPress={handleClose}
              variant="outline"
              style={styles.button}
              disabled={loading}
            />
            <Button
              title={loading ? "Deleting..." : "Delete"}
              onPress={handleConfirm}
              style={{...styles.button, ...styles.deleteButton}}
              disabled={!isConfirmationValid || loading}
              textStyle={styles.deleteButtonText}
            />
          </View>

          {/* Loading Indicator */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.error} />
              <Text style={styles.loadingText}>Deleting your account...</Text>
            </View>
          )}
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
    maxWidth: 500,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  warningIconContainer: {
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.error,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  warningSection: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#DC2626',
    lineHeight: 20,
  },
  dataSection: {
    marginBottom: 24,
  },
  dataTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray800,
    marginBottom: 12,
  },
  dataList: {
    backgroundColor: Colors.gray50,
    borderRadius: 8,
    padding: 16,
  },
  dataItem: {
    fontSize: 14,
    color: Colors.gray700,
    lineHeight: 20,
    marginBottom: 4,
  },
  confirmationSection: {
    marginBottom: 24,
  },
  confirmationLabel: {
    fontSize: 14,
    color: Colors.gray700,
    marginBottom: 8,
  },
  deleteText: {
    fontWeight: '700',
    color: Colors.error,
  },
  confirmationInput: {
    borderWidth: 2,
    borderColor: Colors.gray300,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: Colors.white,
  },
  confirmationInputValid: {
    borderColor: Colors.error,
    backgroundColor: '#FEF2F2',
  },
  confirmationInputDisabled: {
    backgroundColor: Colors.gray100,
    color: Colors.gray500,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
  },
  deleteButton: {
    backgroundColor: Colors.error,
  },
  deleteButtonText: {
    color: Colors.white,
    fontWeight: '700',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.gray50,
    borderRadius: 8,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.gray600,
  },
});