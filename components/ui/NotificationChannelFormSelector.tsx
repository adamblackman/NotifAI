import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { NotificationChannelSelector } from '@/components/ui/NotificationChannelSelector';
import { PhoneNumberModal } from '@/components/ui/PhoneNumberModal';
import { useProfile } from '@/hooks/useProfile';

interface NotificationChannelFormSelectorProps {
  selectedChannels: string[];
  onChannelsChange: (channels: string[]) => void;
}

export function NotificationChannelFormSelector({ 
  selectedChannels, 
  onChannelsChange 
}: NotificationChannelFormSelectorProps) {
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const { profile, updateProfile } = useProfile();

  const handleChannelsChange = async (channels: string[]) => {
    const originalChannels = [...selectedChannels];

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
      
      onChannelsChange(updatedChannels);
      return;
    }

    onChannelsChange(channels);
  };

  const handlePhoneSave = async (countryCode: string, phoneNumber: string) => {
    try {
      // Update profile with phone information
      await updateProfile({
        phoneNumber,
        countryCode,
      });

      // Now update the channels with WhatsApp
      const newChannels = [...selectedChannels, 'whatsapp'];
      onChannelsChange(newChannels);

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
        showTitle={true}
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