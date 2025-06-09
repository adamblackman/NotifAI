import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { Picker } from '@react-native-picker/picker';
import { Colors } from '@/constants/Colors';
import { usePreferences } from '@/hooks/usePreferences';
import { Card } from '@/components/ui/Card';

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function PreferencesScreen() {
  const { preferences, updateNotificationWindow, updatePersonality, updateNotificationDays } = usePreferences();
  const [startTime, setStartTime] = useState(preferences.notificationWindow.start);
  const [endTime, setEndTime] = useState(preferences.notificationWindow.end);
  const [selectedDays, setSelectedDays] = useState(preferences.notificationDays || new Array(7).fill(true));

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Preferences</Text>
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
              thumbStyle={{ backgroundColor: Colors.primary }}
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
              thumbStyle={{ backgroundColor: Colors.primary }}
            />
          </View>
        </Card>
        
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>AI Personality</Text>
          <Text style={styles.sectionDescription}>
            Choose how your AI companion communicates with you
          </Text>
          
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={preferences.personality}
              onValueChange={updatePersonality}
              style={styles.picker}
            >
              <Picker.Item label="Serious" value="serious" />
              <Picker.Item label="Friendly" value="friendly" />
              <Picker.Item label="Motivating" value="motivating" />
              <Picker.Item label="Funny" value="funny" />
            </Picker>
          </View>
        </Card>
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
  pickerContainer: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 20,
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
});