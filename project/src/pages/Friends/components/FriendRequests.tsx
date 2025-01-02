import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { Check, X } from 'lucide-react';
import type { Profile } from '../../../types/database.types';

interface FriendRequestWithSender {
  sender: Profile;
}

export default function FriendRequests() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<FriendRequestWithSender[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('friend_requests')
          .select(`
            sender:sender_id(id, username, avatar_url, university)
          `)
          .eq('receiver_id', user.id)
          .eq('status', 'pending') as { data: FriendRequestWithSender[] | null, error: any };

        if (error) throw error;
        setRequests(data || []);
      } catch (error) {
        console.error('Error fetching friend requests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [user]);

  const handleRequest = async (senderId: string, status: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status })
        .eq('sender_id', senderId)
        .eq('receiver_id', user?.id);

      if (error) throw error;

      // Remove the request from the list
      setRequests(requests.filter(request => request.sender.id !== senderId));
    } catch (error) {
      console.error('Error handling friend request:', error);
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
      <h2 className="text-2xl font-bold mb-4">Friend Requests</h2>
      <div className="space-y-4">
        {requests.length === 0 ? (
          <p className="text-gray-500">No pending friend requests.</p>
        ) : (
          requests.map(({ sender }) => (
            <div key={sender.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <img
                  src={sender.avatar_url || 'https://via.placeholder.com/40'}
                  alt={sender.username}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <h3 className="font-semibold">{sender.username}</h3>
                  <p className="text-sm text-gray-500">{sender.university}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleRequest(sender.id, 'accepted')}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-full"
                  title="Accept"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleRequest(sender.id, 'rejected')}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                  title="Reject"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 