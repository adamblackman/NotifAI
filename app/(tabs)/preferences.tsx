import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert, TextInput } from 'react-native';
import Slider from '@react-native-community/slider';
import { Search } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { usePreferences } from '@/hooks/usePreferences';
import { useProfile } from '@/hooks/useProfile';
import { useDeleteAccount } from '@/hooks/useDeleteAccount';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { DeleteAccountModal } from '@/components/ui/DeleteAccountModal';
import { Input } from '@/components/ui/Input';

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const personalityOptions = [
  { label: 'Serious', value: 'serious' },
  { label: 'Friendly', value: 'friendly' },
  { label: 'Motivating', value: 'motivating' },
  { label: 'Funny', value: 'funny' },
];

const countries = [
  { code: '+1', name: 'United States', flag: '🇺🇸' },
  { code: '+1', name: 'Canada', flag: '🇨🇦' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+33', name: 'France', flag: '🇫🇷' },
  { code: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: '+39', name: 'Italy', flag: '🇮🇹' },
  { code: '+34', name: 'Spain', flag: '🇪🇸' },
  { code: '+31', name: 'Netherlands', flag: '🇳🇱' },
  { code: '+46', name: 'Sweden', flag: '🇸🇪' },
  { code: '+47', name: 'Norway', flag: '🇳🇴' },
  { code: '+45', name: 'Denmark', flag: '🇩🇰' },
  { code: '+358', name: 'Finland', flag: '🇫🇮' },
  { code: '+41', name: 'Switzerland', flag: '🇨🇭' },
  { code: '+43', name: 'Austria', flag: '🇦🇹' },
  { code: '+32', name: 'Belgium', flag: '🇧🇪' },
  { code: '+351', name: 'Portugal', flag: '🇵🇹' },
  { code: '+353', name: 'Ireland', flag: '🇮🇪' },
  { code: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: '+64', name: 'New Zealand', flag: '🇳🇿' },
  { code: '+81', name: 'Japan', flag: '🇯🇵' },
  { code: '+82', name: 'South Korea', flag: '🇰🇷' },
  { code: '+86', name: 'China', flag: '🇨🇳' },
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+55', name: 'Brazil', flag: '🇧🇷' },
  { code: '+52', name: 'Mexico', flag: '🇲🇽' },
  { code: '+54', name: 'Argentina', flag: '🇦🇷' },
  { code: '+56', name: 'Chile', flag: '🇨🇱' },
  { code: '+57', name: 'Colombia', flag: '🇨🇴' },
  { code: '+51', name: 'Peru', flag: '🇵🇪' },
  { code: '+27', name: 'South Africa', flag: '🇿🇦' },
  { code: '+20', name: 'Egypt', flag: '🇪🇬' },
  { code: '+234', name: 'Nigeria', flag: '🇳🇬' },
  { code: '+254', name: 'Kenya', flag: '🇰🇪' },
  { code: '+971', name: 'UAE', flag: '🇦🇪' },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+972', name: 'Israel', flag: '🇮🇱' },
  { code: '+90', name: 'Turkey', flag: '🇹🇷' },
  { code: '+7', name: 'Russia', flag: '🇷🇺' },
  { code: '+380', name: 'Ukraine', flag: '🇺🇦' },
  { code: '+48', name: 'Poland', flag: '🇵🇱' },
  { code: '+420', name: 'Czech Republic', flag: '🇨🇿' },
  { code: '+36', name: 'Hungary', flag: '🇭🇺' },
  { code: '+40', name: 'Romania', flag: '🇷🇴' },
  { code: '+30', name: 'Greece', flag: '🇬🇷' },
  { code: '+385', name: 'Croatia', flag: '🇭🇷' },
  { code: '+386', name: 'Slovenia', flag: '🇸🇮' },
  { code: '+421', name: 'Slovakia', flag: '🇸🇰' },
  { code: '+370', name: 'Lithuania', flag: '🇱🇹' },
  { code: '+371', name: 'Latvia', flag: '🇱🇻' },
  { code: '+372', name: 'Estonia', flag: '🇪🇪' },
];

export default function PreferencesScreen() {
  const { preferences, updateNotificationWindow, updatePersonality, updateNotificationDays } = usePreferences();
  const { profile, updateProfile } = useProfile();
  const { signOut } = useAuth();
  const { deleteAccount, loading: deleteLoading } = useDeleteAccount();
  const [startTime, setStartTime] = useState(preferences.notificationWindow.start);
  const [endTime, setEndTime] = useState(preferences.notificationWindow.end);
  const [selectedDays, setSelectedDays] = useState(preferences.notificationDays || new Array(7).fill(true));
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [email, setEmail] = useState(profile.email || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  useEffect(() => {
    setEmail(profile.email || '');
    
    // Parse existing phone number to extract country code and number
    if (profile.phoneNumber) {
      const fullNumber = profile.phoneNumber;
      // Find matching country code
      const matchingCountry = countries.find(country => 
        fullNumber.startsWith(country.code)
      );
      
      if (matchingCountry) {
        setSelectedCountry(matchingCountry);
        setPhoneNumber(fullNumber.substring(matchingCountry.code.length));
      } else {
        // Fallback: assume it's a full international number
        setPhoneNumber(fullNumber.startsWith('+') ? fullNumber.substring(1) : fullNumber);
      }
    }
  }, [profile.email, profile.phoneNumber]);

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.code.includes(searchQuery)
  );

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

  const handleContactInfoSave = async () => {
    try {
      const updates: { email?: string; phoneNumber?: string; countryCode?: string } = {};
      
      // Only update email if it has a value
      if (email && email.trim()) {
        updates.email = email.trim();
      }
      
      // Only update phone if it has a value and is in correct format
      if (phoneNumber && phoneNumber.trim()) {
        // Validate phone number format (basic validation)
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        if (cleanNumber.length < 7 || cleanNumber.length > 15) {
          Alert.alert('Error', 'Please enter a valid phone number');
          return;
        }

        const fullNumber = `${selectedCountry.code}${cleanNumber}`;
        updates.phoneNumber = fullNumber;
        updates.countryCode = selectedCountry.code;
      }
      
      await updateProfile(updates);
      Alert.alert('Success', 'Contact information updated successfully!');
    } catch (error) {
      console.error('Error updating contact info:', error);
      Alert.alert('Error', 'Failed to update contact information. Please try again.');
    }
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

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      
      // Show success message
      Alert.alert(
        'Account Deleted',
        'Your account has been permanently deleted. All your data has been removed from our servers.',
        [{ text: 'OK' }]
      );
      
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert(
        'Deletion Failed',
        'There was an error deleting your account. Please try again or contact support if the problem persists.',
        [{ text: 'OK' }]
      );
    }
  };

  const getCurrentPersonalityLabel = () => {
    const option = personalityOptions.find(opt => opt.value === preferences.personality);
    return option ? option.label : 'Select personality';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header />
        <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}
      >
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <Text style={styles.sectionDescription}>
            Add your email and phone number to receive notifications via multiple channels
          </Text>
          
          <Input
            placeholder="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />
          
          <View style={styles.phoneInputContainer}>
            <TouchableOpacity 
              style={styles.countrySelector}
              onPress={() => setShowCountryPicker(!showCountryPicker)}
            >
              <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
              <Text style={styles.countryCode}>{selectedCountry.code}</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.phoneInput}
              placeholder="Phone number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              maxLength={15}
            />
          </View>

          {showCountryPicker && (
            <View style={styles.countryPicker}>
              <View style={styles.searchContainer}>
                <Search size={16} color={Colors.gray400} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search countries..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <ScrollView style={styles.countryList} showsVerticalScrollIndicator={false}>
                {filteredCountries.map((country, index) => (
                  <TouchableOpacity
                    key={`${country.code}-${country.name}-${index}`}
                    style={styles.countryItem}
                    onPress={() => {
                      setSelectedCountry(country);
                      setShowCountryPicker(false);
                      setSearchQuery('');
                    }}
                  >
                    <Text style={styles.countryFlag}>{country.flag}</Text>
                    <Text style={styles.countryName}>{country.name}</Text>
                    <Text style={styles.countryCodeText}>{country.code}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          
          <TouchableOpacity style={styles.saveButton} onPress={handleContactInfoSave}>
            <Text style={styles.saveButtonText}>Save Contact Info</Text>
          </TouchableOpacity>
        </Card>
        
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

        <Card style={styles.deleteSection}>
          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={() => setShowDeleteModal(true)}
            disabled={deleteLoading}
          >
            <Text style={styles.deleteButtonText}>
              {deleteLoading ? 'Deleting Account...' : 'Delete Account'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.deleteWarning}>
            ⚠️ This action cannot be undone. All your data will be permanently deleted.
          </Text>
        </Card>
        
        <View style={styles.bottomPadding} />
        </ScrollView>

        <DeleteAccountModal
          visible={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAccount}
          loading={deleteLoading}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
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
  input: {
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
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
  deleteSection: {
    margin: 20,
    marginTop: 0,
    zIndex: -1,
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteWarning: {
    fontSize: 12,
    color: '#dc2626',
    textAlign: 'center',
    lineHeight: 16,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    minWidth: 100,
  },
  countryFlag: {
    fontSize: 20,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray800,
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  countryPicker: {
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: 8,
    marginBottom: 16,
    maxHeight: 200,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  countryList: {
    maxHeight: 150,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    gap: 12,
  },
  countryName: {
    flex: 1,
    fontSize: 14,
    color: Colors.gray800,
  },
  countryCodeText: {
    fontSize: 14,
    color: Colors.gray600,
    fontWeight: '500',
  },
});