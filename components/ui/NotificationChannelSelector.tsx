import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bell, Mail, MessageCircle } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';

interface NotificationChannelSelectorProps {
  selectedChannels: string[];
  onChannelsChange: (channels: string[]) => void;
  availableChannels?: string[];
}

const channelConfig = {
  push: {
    icon: Bell,
    label: 'Push',
    color: Colors.primary,
  },
  email: {
    icon: Mail,
    label: 'Email',
    color: Colors.success,
  },
  whatsapp: {
    icon: MessageCircle,
    label: 'WhatsApp',
    color: '#25D366',
  },
};

export function NotificationChannelSelector({ 
  selectedChannels, 
  onChannelsChange,
  availableChannels = ['push', 'email', 'whatsapp']
}: NotificationChannelSelectorProps) {
  const toggleChannel = (channel: string) => {
    if (selectedChannels.includes(channel)) {
      onChannelsChange(selectedChannels.filter(c => c !== channel));
    } else {
      onChannelsChange([...selectedChannels, channel]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notification Channels</Text>
      <View style={styles.channelsContainer}>
        {availableChannels.map((channel) => {
          const config = channelConfig[channel as keyof typeof channelConfig];
          const Icon = config.icon;
          const isSelected = selectedChannels.includes(channel);
          
          return (
            <TouchableOpacity
              key={channel}
              style={[
                styles.channelButton,
                isSelected && styles.channelButtonSelected,
                { borderColor: config.color }
              ]}
              onPress={() => toggleChannel(channel)}
            >
              <Icon 
                size={20} 
                color={isSelected ? Colors.white : config.color} 
              />
              <Text style={[
                styles.channelLabel,
                isSelected && styles.channelLabelSelected
              ]}>
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray800,
    marginBottom: 12,
  },
  channelsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  channelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: Colors.white,
    gap: 6,
  },
  channelButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  channelLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray700,
  },
  channelLabelSelected: {
    color: Colors.white,
  },
});