import { useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function useDeleteAccount() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const deleteAccount = async (): Promise<void> => {
    if (!user) {
      throw new Error('No user found');
    }

    setLoading(true);

    try {
      // Step 1: Delete all user data from database tables
      console.log('🗑️ Starting account deletion process...');

      // Delete scheduled notifications
      const { error: notificationsError } = await supabase
        .from('scheduled_notifications')
        .delete()
        .eq('user_id', user.id);

      if (notificationsError) {
        console.error('Error deleting notifications:', notificationsError);
        throw new Error('Failed to delete notification data');
      }

      // Delete device tokens
      const { error: tokensError } = await supabase
        .from('device_tokens')
        .delete()
        .eq('user_id', user.id);

      if (tokensError) {
        console.error('Error deleting device tokens:', tokensError);
        throw new Error('Failed to delete device token data');
      }

      // Delete goals (this will cascade to related data)
      const { error: goalsError } = await supabase
        .from('goals')
        .delete()
        .eq('user_id', user.id);

      if (goalsError) {
        console.error('Error deleting goals:', goalsError);
        throw new Error('Failed to delete goals data');
      }

      // Delete preferences
      const { error: preferencesError } = await supabase
        .from('preferences')
        .delete()
        .eq('user_id', user.id);

      if (preferencesError) {
        console.error('Error deleting preferences:', preferencesError);
        throw new Error('Failed to delete preferences data');
      }

      // Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) {
        console.error('Error deleting profile:', profileError);
        throw new Error('Failed to delete profile data');
      }

      console.log('✅ All user data deleted successfully');

      // Step 2: Delete the authentication record
      console.log('🔐 Deleting authentication record...');
      
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);

      if (authError) {
        console.error('Error deleting auth user:', authError);
        // Continue with local cleanup even if auth deletion fails
        console.warn('⚠️ Auth deletion failed, continuing with local cleanup');
      } else {
        console.log('✅ Authentication record deleted successfully');
      }

      // Step 3: Clear local storage and session data
      console.log('🧹 Clearing local storage...');
      
      try {
        await AsyncStorage.clear();
        console.log('✅ Local storage cleared');
      } catch (storageError) {
        console.error('Error clearing local storage:', storageError);
        // Continue even if local storage clearing fails
      }

      // Step 4: Sign out from Supabase
      console.log('👋 Signing out...');
      
      try {
        await supabase.auth.signOut();
        console.log('✅ Signed out successfully');
      } catch (signOutError) {
        console.error('Error signing out:', signOutError);
        // Continue even if sign out fails
      }

      console.log('🎉 Account deletion completed successfully');

    } catch (error) {
      console.error('❌ Account deletion failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    deleteAccount,
    loading,
  };
}