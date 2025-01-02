import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Bell, Check } from 'lucide-react';
import type { Notification } from '../../types/database.types';

export default function Notifications() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setNotifications(data || []);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mt-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>
      
      <div className="space-y-4">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`bg-white p-4 rounded-lg shadow flex items-center justify-between ${
              !notification.read ? 'border-l-4 border-indigo-600' : ''
            }`}
          >
            <div className="flex items-center space-x-3">
              <Bell className={`w-5 h-5 ${!notification.read ? 'text-indigo-600' : 'text-gray-500'}`} />
              <div>
                <p className="text-gray-800">{notification.content}</p>
                <p className="text-sm text-gray-500">
                  {new Date(notification.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            {!notification.read && (
              <button
                onClick={() => markAsRead(notification.id)}
                className="p-2 text-gray-500 hover:bg-gray-50 rounded-full"
              >
                <Check className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No notifications yet
          </div>
        )}
      </div>
    </div>
  );
}