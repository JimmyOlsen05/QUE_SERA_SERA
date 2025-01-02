import { supabase } from './supabase';
import { Notification } from '../types';

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: Notification['type'];
}

export async function createNotification({
  userId,
  title,
  message,
  type = 'info'
}: CreateNotificationParams): Promise<Notification | null> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        read: false
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
} 