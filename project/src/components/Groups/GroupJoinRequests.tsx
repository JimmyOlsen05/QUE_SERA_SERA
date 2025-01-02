import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Check, X } from 'lucide-react';

interface JoinRequest {
  id: string;
  group_id: string;
  user_id: string;
  status: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
}

interface GroupJoinRequestsProps {
  groupId: string;
  isAdmin: boolean;
}

export default function GroupJoinRequests({ groupId, isAdmin }: GroupJoinRequestsProps) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const {} = useAuthStore();

  useEffect(() => {
    if (isAdmin) {
      fetchRequests();
    }
  }, [groupId, isAdmin]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('group_join_requests')
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .eq('group_id', groupId)
        .eq('status', 'pending');

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching join requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from('group_join_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // If approved, add user to group members
      if (status === 'approved') {
        const request = requests.find(r => r.id === requestId);
        if (!request) return;

        const { error: memberError } = await supabase
          .from('group_members')
          .insert({
            group_id: groupId,
            user_id: request.user_id,
            role: 'member'
          });

        if (memberError) throw memberError;
      }

      // Refresh the requests list
      fetchRequests();
    } catch (error) {
      console.error('Error handling join request:', error);
    }
  };

  if (!isAdmin || loading) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Join Requests</h3>
      {requests.length === 0 ? (
        <p className="text-gray-500">No pending requests</p>
      ) : (
        <div className="space-y-2">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between p-3 bg-white rounded-lg shadow"
            >
              <div className="flex items-center space-x-3">
                <img
                  src={request.profiles.avatar_url || 'https://via.placeholder.com/40'}
                  alt={request.profiles.username}
                  className="w-8 h-8 rounded-full"
                />
                <span className="font-medium">{request.profiles.username}</span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleRequest(request.id, 'approved')}
                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                >
                  <Check size={20} />
                </button>
                <button
                  onClick={() => handleRequest(request.id, 'rejected')}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
