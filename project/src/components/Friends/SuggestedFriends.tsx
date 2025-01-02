import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { UserPlus } from 'lucide-react';

interface SuggestedUser {
  id: string;
  username: string;
  avatar_url: string;
  university: string;
}

export default function SuggestedFriends() {
  const { user } = useAuthStore();
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuggestions();
  }, [user]);

  const fetchSuggestions = async () => {
    if (!user) return;

    try {
      console.log('Fetching suggestions for user:', user.id); // Debug log

      // Simplified query to test
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, university')
        .neq('id', user.id)
        .limit(4);

      if (error) {
        console.error('Supabase error:', error); // Debug log
        throw error;
      }

      console.log('Suggestions found:', data); // Debug log
      setSuggestions(data || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (receiverId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          status: 'pending'
        });

      if (error) throw error;
      
      // Remove the user from suggestions
      setSuggestions(prev => prev.filter(s => s.id !== receiverId));
    } catch (error) {
      console.error('Error sending friend request:', error);
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
      <h2 className="text-xl font-bold mb-4">People You May Know</h2>
      {suggestions.length === 0 ? (
        <p className="text-gray-500">No suggestions available</p>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="flex items-center p-4 bg-gray-50 rounded-lg">
              <img
                src={suggestion.avatar_url || 'https://via.placeholder.com/40'}
                alt={suggestion.username}
                className="w-10 h-10 rounded-full mr-4"
              />
              <div className="flex-1">
                <h3 className="font-semibold">{suggestion.username}</h3>
                <p className="text-sm text-gray-500">{suggestion.university}</p>
              </div>
              <button
                onClick={() => sendFriendRequest(suggestion.id)}
                className="text-indigo-600 hover:text-indigo-800"
                title="Send friend request"
              >
                <UserPlus className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 