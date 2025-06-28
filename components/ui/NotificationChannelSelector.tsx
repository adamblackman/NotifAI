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
          size={24} 
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
            <View key={channel} style={styles.channelItem}>
              <TouchableOpacity
                style={[
                  styles.channelButton,
                  isSelected && styles.channelButtonSelected,
                  { backgroundColor: isSelected ? config.color : Colors.white }
                ]}
                onPress={() => toggleChannel(channel)}
              >
                {renderIcon(channel, config, isSelected)}
              </TouchableOpacity>
              <Text style={[
                styles.channelLabel,
                isSelected && { color: config.color }
              ]}>
                {config.label}
              </Text>
            </View>
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
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  channelItem: {
    alignItems: 'center',
  },
  channelButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.gray200,
    marginBottom: 4,
  },
  channelButtonSelected: {
    borderColor: 'transparent',
  },
  channelLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.gray600,
    marginTop: 4,
  },
  brandIcon: {
    width: 24,
    height: 24,
  },
  brandIconSelected: {
    tintColor: Colors.white,
  },
});