import { useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

interface SearchResult {
  id: string;
  username: string;
  avatar_url: string;
  university: string;
}

export default function SearchUsers() {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim() || !user) return;

    setLoading(true);
    try {
      console.log('Searching for:', searchTerm); // Debug log

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, university')
        .neq('id', user.id)
        .or(`username.ilike.%${searchTerm}%,university.ilike.%${searchTerm}%`)
        .limit(5);

      if (error) {
        console.error('Search error:', error);
        throw error;
      }

      console.log('Search results:', data); // Debug log
      setResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (receiverId: string) => {
    if (!user) return;

    try {
      // Check if request already exists
      const { data: existingRequest } = await supabase
        .from('friend_requests')
        .select()
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
        .single();

      if (existingRequest) {
        alert('A friend request already exists between you and this user');
        return;
      }

      // Check if already friends
      const { data: existingFriend } = await supabase
        .from('friends')
        .select()
        .or(`and(user_id1.eq.${user.id},user_id2.eq.${receiverId}),and(user_id1.eq.${receiverId},user_id2.eq.${user.id})`)
        .single();

      if (existingFriend) {
        alert('You are already friends with this user');
        return;
      }

      const { error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          status: 'pending'
        });

      if (error) throw error;
      
      // Remove the user from results
      setResults(prev => prev.filter(r => r.id !== receiverId));
      alert('Friend request sent successfully!');
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Failed to send friend request');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users by username..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <button
            type="submit"
            disabled={loading || !searchTerm.trim()}
            className="absolute right-2 top-2 px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-sm"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((result) => (
            <div key={result.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <img
                  src={result.avatar_url || 'https://via.placeholder.com/40'}
                  alt={result.username}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <h3 className="font-semibold">{result.username}</h3>
                  <p className="text-sm text-gray-500">{result.university}</p>
                </div>
              </div>
              <button
                onClick={() => sendFriendRequest(result.id)}
                className="flex items-center gap-2 px-3 py-1 text-indigo-600 hover:bg-indigo-50 rounded-lg"
              >
                <UserPlus className="h-5 w-5" />
                <span>Add Friend</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {searchTerm && results.length === 0 && !loading && (
        <p className="text-gray-500 text-center">No users found</p>
      )}
    </div>
  );
} 