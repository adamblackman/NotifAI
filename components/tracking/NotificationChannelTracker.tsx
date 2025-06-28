import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { NotificationChannelSelector } from '@/components/ui/NotificationChannelSelector';
import { PhoneNumberModal } from '@/components/ui/PhoneNumberModal';
import { useGoals } from '@/hooks/useGoals';
import { useProfile } from '@/hooks/useProfile';
import { Goal } from '@/types/Goal';

interface NotificationChannelTrackerProps {
  goal: Goal;
}

export function NotificationChannelTracker({ goal }: NotificationChannelTrackerProps) {
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const { updateGoal } = useGoals();
  const { profile, updateProfile } = useProfile();

  const handleChannelsChange = async (channels: string[]) => {
    // Check if WhatsApp is selected but no phone number is stored
    if (channels.includes('whatsapp') && !profile.phoneNumber) {
      setShowPhoneModal(true);
      return;
    }

    // Check if email is selected but no email is stored
    if (channels.includes('email') && !profile.email) {
      Alert.alert(
        'Email Required',
        'Please add your email address in Settings to receive email notifications.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      await updateGoal(goal.id, {
        notificationChannels: channels,
      });
    } catch (error) {
      console.error('Error updating notification channels:', error);
      Alert.alert('Error', 'Failed to update notification channels');
    }
  };

  const handlePhoneSave = async (countryCode: string, phoneNumber: string) => {
    try {
      // Update profile with phone information
      await updateProfile({
        phoneNumber,
        countryCode,
      });

      // Now update the goal with WhatsApp channel
      const currentChannels = goal.notificationChannels || ['push'];
      if (!currentChannels.includes('whatsapp')) {
        await updateGoal(goal.id, {
          notificationChannels: [...currentChannels, 'whatsapp'],
        });
      }

      Alert.alert('Success', 'Phone number saved and WhatsApp notifications enabled!');
    } catch (error) {
      console.error('Error saving phone number:', error);
      Alert.alert('Error', 'Failed to save phone number');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notification Settings</Text>
      <Text style={styles.description}>
        Choose how you want to be reminded about this goal
      </Text>
      
      <NotificationChannelSelector
        selectedChannels={goal.notificationChannels || ['push']}
        onChannelsChange={handleChannelsChange}
        showTitle={false}
      />

      <PhoneNumberModal
        visible={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        onSave={handlePhoneSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray800,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: Colors.gray600,
    marginBottom: 16,
    lineHeight: 20,
  },
});