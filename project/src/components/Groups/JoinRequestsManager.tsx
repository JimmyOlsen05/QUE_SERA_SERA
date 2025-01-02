import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface JoinRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user: {
    username: string;
    avatar_url: string;
  };
}

interface JoinRequestsManagerProps {
  groupId: string;
  onRequestProcessed?: () => void;
}

export const JoinRequestsManager: React.FC<JoinRequestsManagerProps> = ({ groupId, onRequestProcessed }) => {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJoinRequests = async () => {
    try {
      // First, get the join requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('group_join_requests')
        .select(`
          id,
          user_id,
          status,
          created_at
        `)
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      if (!requestsData || requestsData.length === 0) {
        setRequests([]);
        return;
      }

      // Then, get the user profiles for these requests
      const userIds = requestsData.map(request => request.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const transformedData: JoinRequest[] = requestsData.map((request) => {
        const userProfile = profilesData?.find(profile => profile.id === request.user_id);
        return {
          id: request.id,
          user_id: request.user_id,
          status: request.status,
          created_at: request.created_at,
          user: {
            username: userProfile?.username ?? '',
            avatar_url: userProfile?.avatar_url ?? ''
          }
        };
      });
      
      setRequests(transformedData);
    } catch (error) {
      console.error('Error fetching join requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (requestId: string, userId: string, approved: boolean) => {
    try {
      // First update the request status
      const { error: updateError } = await supabase
        .from('group_join_requests')
        .update({ status: approved ? 'approved' : 'rejected' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Get group information 
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('name')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;
      if (!groupData || !groupData.name) {
        throw new Error('Group data not found');
      }

      // Get the group admin
      const { data: adminData, error: adminError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('role', 'admin')
        .single();

      if (adminError) throw adminError;
      if (!adminData || !adminData.user_id) {
        throw new Error('Admin data not found');
      }

      // Get user information for the notification
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();

      if (userError) throw userError;
      if (!userData || !userData.username) {
        throw new Error('User data not found');
      }

      console.log('Processing request with data:', {
        groupName: groupData.name,
        adminId: adminData.user_id,
        username: userData.username,
        approved
      });

      // If approved, add the user to the group
      if (approved) {
        const { error: memberError } = await supabase
          .from('group_members')
          .insert({
            group_id: groupId,
            user_id: userId,
            role: 'member'
          });

        if (memberError) {
          console.error('Error adding group member:', memberError);
          throw memberError;
        }

        // Create notification for the admin
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: adminData.user_id,
            title: 'New Group Member',
            content: `${userData.username} has joined ${groupData.name}`,
            type: 'group_member',
            read: false,
            metadata: {
              group_id: groupId,
              user_id: userId,
              action: 'join_approved'
            }
          });

        if (notificationError) {
          console.error('Error creating admin notification:', notificationError);
          throw notificationError;
        }

        // Create notification for the user
        const { error: userNotificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            title: 'Join Request Approved',
            content: `Your request to join ${groupData.name} has been approved`,
            type: 'group_member',
            read: false,
            metadata: {
              group_id: groupId,
              user_id: userId,
              action: 'join_request_approved'
            }
          });

        if (userNotificationError) {
          console.error('Error creating user notification:', userNotificationError);
          throw userNotificationError;
        }
      } else {
        // Prepare rejection notification
        const rejectionNotification = {
          user_id: userId,
          title: 'Join Request Rejected',
          content: `Your request to join ${groupData.name} has been rejected`,
          type: 'group_member',
          read: false,
          metadata: {
            group_id: groupId,
            user_id: userId,
            action: 'join_request_rejected'
          }
        };

        console.log('Creating rejection notification:', rejectionNotification);

        // Create notification for the user about rejection
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(rejectionNotification);

        if (notificationError) {
          console.error('Error creating rejection notification:', notificationError);
          throw notificationError;
        }
      }

      // Update the local state
      setRequests(prev => prev.filter(req => req.id !== requestId));
      if (onRequestProcessed) onRequestProcessed();
    } catch (error) {
      console.error('Error processing join request:', error);
      throw error; // Re-throw to ensure the error is properly handled
    }
  };

  useEffect(() => {
    fetchJoinRequests();
  }, [groupId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center p-4 text-gray-500">
        No pending join requests
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <div
          key={request.id}
          className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
        >
          <div className="flex items-center space-x-4">
            <img
              src={request.user.avatar_url || '/default-avatar.png'}
              alt={`${request.user.username}'s avatar`}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <p className="font-medium">{request.user.username}</p>
              <p className="text-sm text-gray-500">
                Requested {new Date(request.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleRequest(request.id, request.user_id, true)}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              Accept
            </button>
            <button
              onClick={() => handleRequest(request.id, request.user_id, false)}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
