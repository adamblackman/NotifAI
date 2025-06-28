import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Bell } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';

interface NotificationChannelSelectorProps {
  selectedChannels: string[];
  onChannelsChange: (channels: string[]) => void;
  availableChannels?: string[];
  showTitle?: boolean;
}

const channelConfig = {
  push: {
    icon: 'lucide',
    label: 'Push',
    color: Colors.primary,
  },
  email: {
    icon: 'image',
    label: 'Gmail',
    color: '#EA4335',
    imageSource: require('@/assets/images/gmail.png'),
  },
  whatsapp: {
    icon: 'image',
    label: 'WhatsApp',
    color: '#25D366',
    imageSource: require('@/assets/images/whatsapp.png'),
  },
};

export function NotificationChannelSelector({ 
  selectedChannels, 
  onChannelsChange,
  availableChannels = ['push', 'email', 'whatsapp'],
  showTitle = true
}: NotificationChannelSelectorProps) {
  const toggleChannel = (channel: string) => {
    if (selectedChannels.includes(channel)) {
      onChannelsChange(selectedChannels.filter(c => c !== channel));
    } else {
      onChannelsChange([...selectedChannels, channel]);
    }
  };

  const renderIcon = (channel: string, config: any, isSelected: boolean) => {
    if (config.icon === 'lucide') {
      return (
        <Bell 
          size={20} 
          color={isSelected ? Colors.white : config.color} 
        />
      );
    } else {
      return (
        <Image 
          source={config.imageSource}
          style={[
            styles.brandIcon,
            isSelected && styles.brandIconSelected
          ]}
          resizeMode="contain"
        />
      );
    }
  };

  return (
    <View style={styles.container}>
      {showTitle && (
        <Text style={styles.title}>Notification Channels</Text>
      )}
      <View style={styles.channelsContainer}>
        {availableChannels.map((channel) => {
          const config = channelConfig[channel as keyof typeof channelConfig];
          const isSelected = selectedChannels.includes(channel);
          
          return (
            <TouchableOpacity
              key={channel}
              style={[
                styles.channelButton,
                isSelected && styles.channelButtonSelected,
                { borderColor: isSelected ? config.color : Colors.gray300 }
              ]}
              onPress={() => toggleChannel(channel)}
            >
              {renderIcon(channel, config, isSelected)}
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
    flexWrap: 'wrap',
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
    minWidth: 80,
  },
  channelButtonSelected: {
    backgroundColor: Colors.primary,
  },
  channelLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray700,
  },
  channelLabelSelected: {
    color: Colors.white,
  },
  brandIcon: {
    width: 20,
    height: 20,
  },
  brandIconSelected: {
    tintColor: Colors.white,
  },
});