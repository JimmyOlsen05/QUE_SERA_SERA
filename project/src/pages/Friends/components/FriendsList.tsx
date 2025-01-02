import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { UserMinus } from 'lucide-react';
import type { Profile } from '../../../types/database.types';

export default function FriendsList() {
  const { user } = useAuthStore();
  const [friends, setFriends] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFriends = async () => {
      if (!user) return;
      
      try {
        // Get all friendships
        const { data: friendships, error: friendshipsError } = await supabase
          .from('friends')
          .select('*')
          .or(`user_id1.eq.${user.id},user_id2.eq.${user.id}`);

        if (friendshipsError) throw friendshipsError;

        // Get friend profiles
        const friendIds = friendships?.map(friendship => 
          friendship.user_id1 === user.id ? friendship.user_id2 : friendship.user_id1
        ) || [];

        if (friendIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', friendIds);

          if (profilesError) throw profilesError;
          setFriends(profiles || []);
        }
      } catch (error) {
        console.error('Error fetching friends:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [user]);

  const handleRemoveFriend = async (friendId: string) => {
    try {
      // Delete friendship
      const { error } = await supabase
        .from('friends')
        .delete()
        .or(`and(user_id1.eq.${user?.id},user_id2.eq.${friendId}),and(user_id1.eq.${friendId},user_id2.eq.${user?.id})`);

      if (error) throw error;

      // Update local state
      setFriends(friends.filter(friend => friend.id !== friendId));
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Your Friends</h2>
      <div className="space-y-4">
        {friends.length === 0 ? (
          <p className="text-gray-500">You haven't added any friends yet.</p>
        ) : (
          friends.map(friend => (
            <div key={friend.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <img
                  src={friend.avatar_url || 'https://via.placeholder.com/40'}
                  alt={friend.username}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <h3 className="font-semibold">{friend.username}</h3>
                  <p className="text-sm text-gray-500">{friend.university}</p>
                </div>
              </div>
              <button
                onClick={() => handleRemoveFriend(friend.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                title="Remove friend"
              >
                <UserMinus className="w-5 h-5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 