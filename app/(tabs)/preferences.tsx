import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { Colors } from '@/constants/Colors';
import { usePreferences } from '@/hooks/usePreferences';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const personalityOptions = [
  { label: 'Serious', value: 'serious' },
  { label: 'Friendly', value: 'friendly' },
  { label: 'Motivating', value: 'motivating' },
  { label: 'Funny', value: 'funny' },
];

export default function PreferencesScreen() {
  const { preferences, updateNotificationWindow, updatePersonality, updateNotificationDays } = usePreferences();
  const { signOut } = useAuth();
  const [startTime, setStartTime] = useState(preferences.notificationWindow.start);
  const [endTime, setEndTime] = useState(preferences.notificationWindow.end);
  const [selectedDays, setSelectedDays] = useState(preferences.notificationDays || new Array(7).fill(true));
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const formatTime = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const handleStartTimeChange = (value: number) => {
    setStartTime(value);
    updateNotificationWindow(value, endTime);
  };

  const handleEndTimeChange = (value: number) => {
    setEndTime(value);
    updateNotificationWindow(startTime, value);
  };

  const toggleDay = (index: number) => {
    const newDays = [...selectedDays];
    newDays[index] = !newDays[index];
    setSelectedDays(newDays);
    updateNotificationDays(newDays);
  };

  const handlePersonalitySelect = (value: string) => {
    updatePersonality(value as 'serious' | 'friendly' | 'motivating' | 'funny');
    setDropdownOpen(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getCurrentPersonalityLabel = () => {
    const option = personalityOptions.find(opt => opt.value === preferences.personality);
    return option ? option.label : 'Select personality';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>
        
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Schedule</Text>
          <Text style={styles.sectionDescription}>
            Choose which days and time window you'd like to receive notifications
          </Text>
          
          <Text style={styles.subsectionTitle}>Days of the week</Text>
          <View style={styles.daysContainer}>
            {weekdays.map((day, index) => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayButton,
                  selectedDays[index] && styles.dayButtonActive
                ]}
                onPress={() => toggleDay(index)}
              >
                <Text style={[
                  styles.dayText,
                  selectedDays[index] && styles.dayTextActive
                ]}>
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.timeSection}>
            <Text style={styles.timeLabel}>Start Time: {formatTime(startTime)}</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={23}
              step={1}
              value={startTime}
              onValueChange={handleStartTimeChange}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.gray200}
            />
          </View>
          
          <View style={styles.timeSection}>
            <Text style={styles.timeLabel}>End Time: {formatTime(endTime)}</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={23}
              step={1}
              value={endTime}
              onValueChange={handleEndTimeChange}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.gray200}
            />
          </View>
        </Card>
        
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>AI Personality</Text>
          <Text style={styles.sectionDescription}>
            Choose how your AI companion communicates with you
          </Text>
          
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setDropdownOpen(!dropdownOpen)}
            >
              <Text style={styles.dropdownButtonText}>{getCurrentPersonalityLabel()}</Text>
              <Text style={styles.dropdownArrow}>{dropdownOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            
            {dropdownOpen && (
              <View style={styles.dropdownList}>
                {personalityOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.dropdownItem,
                      preferences.personality === option.value && styles.dropdownItemSelected
                    ]}
                    onPress={() => handlePersonalitySelect(option.value)}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      preferences.personality === option.value && styles.dropdownItemTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </Card>

        <Card style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        </Card>
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 0,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.gray800,
  },
  section: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.gray800,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 16,
    color: Colors.gray600,
    marginBottom: 20,
    lineHeight: 22,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray700,
    marginBottom: 12,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray600,
  },
  dayTextActive: {
    color: Colors.white,
  },
  timeSection: {
    marginBottom: 20,
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.gray700,
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 9999,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 20,
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: Colors.gray800,
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  dropdownList: {
    position: 'absolute',
    top: '98%',
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 10000,
  },
  dropdownItem: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  dropdownItemSelected: {
    backgroundColor: Colors.primary + '10',
  },
  dropdownItemText: {
    fontSize: 16,
    color: Colors.gray800,
  },
  dropdownItemTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  bottomPadding: {
    height: 100,
  },
  logoutSection: {
    margin: 20,
    zIndex: -1,
  },
});