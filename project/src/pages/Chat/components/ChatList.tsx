import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import type { Profile } from '../../../types/database.types';

export default function ChatList() {
  const { user } = useAuthStore();
  const [friends, setFriends] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFriends = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('friend_requests')
          .select('*, profiles!friend_requests_receiver_id_fkey(*)')
          .eq('status', 'accepted')
          .eq('sender_id', user.id);

        if (error) throw error;
        setFriends(data?.map(fr => fr.profiles) || []);
      } catch (error) {
        console.error('Error fetching friends:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [user]);

  if (loading) {
    return (
      <div className="w-80 bg-white p-4 rounded-lg shadow">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2 mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white p-4 rounded-lg shadow overflow-y-auto">
      <h2 className="text-xl font-semibold mb-4">Messages</h2>
      <div className="space-y-4">
        {friends.map((friend) => (
          <div
            key={friend.id}
            className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
          >
            <img
              src={friend.avatar_url || 'https://via.placeholder.com/40'}
              alt={friend.username}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <h3 className="font-medium">{friend.username}</h3>
              <p className="text-sm text-gray-500">{friend.university}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}