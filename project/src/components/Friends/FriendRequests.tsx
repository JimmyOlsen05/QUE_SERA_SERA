import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { Check, X, UserPlus, Clock } from 'lucide-react';

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender: {
    username: string;
    avatar_url: string;
    university: string;
  };
  receiver: {
    username: string;
    avatar_url: string;
    university: string;
  };
}

interface FriendRequestsProps {
  onUpdate?: () => void;
}

export default function FriendRequests({ onUpdate }: FriendRequestsProps) {
  const { user } = useAuthStore();
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;
    
    try {
      console.log('Fetching requests for user:', user.id);

      // Fetch received requests
      const { data: received, error: receivedError } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:profiles!friend_requests_sender_id_fkey(
            username,
            avatar_url,
            university
          ),
          receiver:profiles!friend_requests_receiver_id_fkey(
            username,
            avatar_url,
            university
          )
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      if (receivedError) throw receivedError;
      setReceivedRequests(received || []);

      // Fetch sent requests
      const { data: sent, error: sentError } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:profiles!friend_requests_sender_id_fkey(
            username,
            avatar_url,
            university
          ),
          receiver:profiles!friend_requests_receiver_id_fkey(
            username,
            avatar_url,
            university
          )
        `)
        .eq('sender_id', user.id)
        .eq('status', 'pending');

      if (sentError) throw sentError;
      setSentRequests(sent || []);

    } catch (error) {
      console.error('Error fetching friend requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      const request = receivedRequests.find(r => r.id === requestId);
      if (!request) return;

      // Update request status
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // If accepted, create friend connection
      if (status === 'accepted') {
        const { error: friendError } = await supabase
          .from('friends')
          .insert({
            user_id1: request.sender_id,
            user_id2: request.receiver_id
          });

        if (friendError) throw friendError;
      }

      // Refresh requests
      fetchRequests();
      // Notify parent component
      onUpdate?.();
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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
          <UserPlus className="h-6 w-6" />
          Received Requests
        </h2>
        
        {receivedRequests.length === 0 ? (
          <p className="text-gray-500">No pending friend requests</p>
        ) : (
          <div className="grid gap-4">
            {receivedRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <img
                    src={request.sender?.avatar_url || 'https://via.placeholder.com/40'}
                    alt={request.sender?.username}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <h3 className="font-semibold">{request.sender?.username}</h3>
                    <p className="text-sm text-gray-500">{request.sender?.university}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRequest(request.id, 'accepted')}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-full"
                    title="Accept"
                  >
                    <Check className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleRequest(request.id, 'rejected')}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                    title="Reject"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
          <Clock className="h-6 w-6" />
          Sent Requests
        </h2>
        
        {sentRequests.length === 0 ? (
          <p className="text-gray-500">No pending sent requests</p>
        ) : (
          <div className="grid gap-4">
            {sentRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <img
                    src={request.receiver?.avatar_url || 'https://via.placeholder.com/40'}
                    alt={request.receiver?.username}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <h3 className="font-semibold">{request.receiver?.username}</h3>
                    <p className="text-sm text-gray-500">{request.receiver?.university}</p>
                  </div>
                </div>
                
                <div className="text-gray-500 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span>Pending</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 