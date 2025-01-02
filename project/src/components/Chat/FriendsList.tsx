import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { Search, MessageCircle } from 'lucide-react';

interface Friend {
  id: string;
  username: string;
  avatar_url: string;
  university: string;
}

interface FriendsListProps {
  onSelectFriend: (friendId: string, username: string) => void;
  selectedFriendId?: string;
}

interface FriendProfile {
  id: string;
  username: string;
  avatar_url: string;
  university: string;
}

interface FriendData {
  user_id1: string;
  user_id2: string;
  profile1: FriendProfile;
  profile2: FriendProfile;
}

export default function FriendsList({ onSelectFriend, selectedFriendId }: FriendsListProps) {
  const { user } = useAuthStore();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchFriends();
  }, [user]);

  const fetchFriends = async () => {
    if (!user) return;
    try {
      const { data: friendsData, error } = await supabase
        .from('friends')
        .select(`
          user_id1,
          user_id2,
          profile1:profiles!friends_user_id1_fkey(
            id, username, avatar_url, university
          ),
          profile2:profiles!friends_user_id2_fkey(
            id, username, avatar_url, university
          )
        `)
        .or(`user_id1.eq.${user.id},user_id2.eq.${user.id}`);

      if (error) throw error;

      const transformedFriends = ((friendsData as unknown) as FriendData[] || []).map(friend => {
        const friendProfile = friend.user_id1 === user?.id ? friend.profile2 : friend.profile1;
        return {
          id: friendProfile.id,
          username: friendProfile.username,
          avatar_url: friendProfile.avatar_url,
          university: friendProfile.university
        };
      }).filter(friend => friend.id); // Filter out any undefined entries

      setFriends(transformedFriends);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.university.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search friends..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-gray-200">
          {filteredFriends.map((friend) => (
            <div
              key={friend.id}
              onClick={() => onSelectFriend(friend.id, friend.username)}
              className={`p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                selectedFriendId === friend.id ? 'bg-indigo-50' : ''
              }`}
            >
              <div className="flex items-center space-x-4">
                <img
                  src={friend.avatar_url || 'https://via.placeholder.com/40'}
                  alt={friend.username}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <p className="font-medium text-gray-900">{friend.username}</p>
                  <p className="text-sm text-gray-500">{friend.university}</p>
                </div>
              </div>
              <MessageCircle className="h-5 w-5 text-gray-400" />
            </div>
          ))}

          {filteredFriends.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              {searchTerm ? 'No friends found' : 'No friends yet'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 