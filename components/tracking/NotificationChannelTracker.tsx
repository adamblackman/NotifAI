import React, { useState, useEffect } from 'react';
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
  const [selectedChannels, setSelectedChannels] = useState(goal.notificationChannels || ['push']);
  const { updateGoal } = useGoals();
  const { profile, updateProfile } = useProfile();

  useEffect(() => {
    setSelectedChannels(goal.notificationChannels || ['push']);
  }, [goal.notificationChannels]);

  const handleChannelsChange = async (channels: string[]) => {
    const originalChannels = [...selectedChannels];
    setSelectedChannels(channels);

    // Check if WhatsApp is being added
    if (
      channels.includes('whatsapp') &&
      !originalChannels.includes('whatsapp') &&
      !profile.phoneNumber
    ) {
      setShowPhoneModal(true);
      return;
    }

    // Check if email is being added
    if (
      channels.includes('email') &&
      !originalChannels.includes('email') &&
      !profile.email
    ) {
      Alert.alert(
        'Email Required',
        'Please add your email address in Settings to receive email notifications.',
        [{ text: 'OK' }]
      );
      
      // Remove email from channels if user doesn't have an email
      const updatedChannels = channels.filter(c => c !== 'email');
      
      // If channels are the same as before, don't update
      if (JSON.stringify(updatedChannels) === JSON.stringify(originalChannels)) {
        return;
      }
      
      channels = updatedChannels;
    }

    try {
      await updateGoal(goal.id, {
        notificationChannels: channels,
      });
    } catch (error) {
      setSelectedChannels(originalChannels);
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
      const newChannels = [...selectedChannels, 'whatsapp'];
      setSelectedChannels(newChannels);
      await updateGoal(goal.id, {
        notificationChannels: newChannels,
      });

      Alert.alert('Success', 'Phone number saved and WhatsApp notifications enabled!');
    } catch (error) {
      console.error('Error saving phone number:', error);
      Alert.alert('Error', 'Failed to save phone number');
    }
  };

  return (
    <View style={styles.container}>
      <NotificationChannelSelector
        key={JSON.stringify(selectedChannels)}
        selectedChannels={selectedChannels}
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
    marginTop: 0,
    marginBottom: 4,
  },
});