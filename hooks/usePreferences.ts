import { useState, useEffect } from 'react';
import { Preferences } from '@/types/Goal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences & { email?: string; phone?: string; enabledChannels?: string[] }>({
    notificationWindow: {
      start: 9, // 9 AM
      end: 21, // 9 PM
    },
    notificationDays: new Array(7).fill(true), // All days selected by default
    personality: 'friendly',
    email: '',
    phone: '',
    enabledChannels: ['push'],
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      setPreferences({
        notificationWindow: {
          start: data.notification_window_start,
          end: data.notification_window_end,
        },
        notificationDays: data.notification_days,
        personality: data.personality,
        email: data.email || '',
        phone: data.phone || '',
        enabledChannels: data.enabled_channels || ['push'],
      });
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationWindow = async (start: number, end: number) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('preferences')
        .update({
          notification_window_start: start,
          notification_window_end: end,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setPreferences(prev => ({
        ...prev,
        notificationWindow: { start, end },
      }));
    } catch (error) {
      console.error('Error updating notification window:', error);
      throw error;
    }
  };

  const updateNotificationDays = async (days: boolean[]) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('preferences')
        .update({
          notification_days: days,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setPreferences(prev => ({
        ...prev,
        notificationDays: days,
      }));
    } catch (error) {
      console.error('Error updating notification days:', error);
      throw error;
    }
  };

  const updatePersonality = async (personality: Preferences['personality']) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('preferences')
        .update({
          personality,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setPreferences(prev => ({
        ...prev,
        personality,
      }));
    } catch (error) {
      console.error('Error updating personality:', error);
      throw error;
    }
  };

  const updateContactInfo = async (email: string, phone: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('preferences')
        .update({
          email: email.trim() || null,
          phone: phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setPreferences(prev => ({
        ...prev,
        email: email.trim(),
        phone: phone.trim(),
      }));
    } catch (error) {
      console.error('Error updating contact info:', error);
      throw error;
    }
  };

  const updateEnabledChannels = async (channels: string[]) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('preferences')
        .update({
          enabled_channels: channels,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setPreferences(prev => ({
        ...prev,
        enabledChannels: channels,
      }));
    } catch (error) {
      console.error('Error updating enabled channels:', error);
      throw error;
    }
  };

  return {
    preferences,
    loading,
    updateNotificationWindow,
    updateNotificationDays,
    updatePersonality,
    updateContactInfo,
    updateEnabledChannels,
    refetch: fetchPreferences,
  };
}