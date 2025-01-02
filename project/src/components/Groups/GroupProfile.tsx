import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import GroupMembers from './GroupMembers';
import GroupJoinRequests from './GroupJoinRequests';
import { UserPlus, Settings, Edit2, Users, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

interface Group {
  id: string;
  name: string;
  description: string;
  creator_id: string;
  created_at: string;
  image_url: string;
  max_members: number;
  settings: {
    allow_member_invites: boolean;
    allow_message_deletion: boolean;
    allow_member_visibility: boolean;
  };
}

interface GroupProfileProps {
  groupId: string;
}

export default function GroupProfile({ groupId }: GroupProfileProps) {
  const { user } = useAuthStore();
  const [group, setGroup] = useState<Group | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSecondaryAdmin, setIsSecondaryAdmin] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [hasRequestPending, setHasRequestPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchGroupDetails();
    checkMembershipStatus();
    checkPendingRequest();
    fetchMemberCount();

    // Set up real-time subscription for join requests
    const subscription = supabase
      .channel('group_join_requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_join_requests',
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          // Create notification for group admin and secondary admins
          const { data: admins } = await supabase
            .from('group_members')
            .select('user_id')
            .eq('group_id', groupId)
            .in('role', ['admin', 'secondary_admin']);

          if (admins) {
            const notifications = admins.map((admin) => ({
              user_id: admin.user_id,
              title: 'New Join Request',
              message: `A user has requested to join ${group?.name}`,
              type: 'info',
              read: false,
              metadata: {
                group_id: groupId,
                request_id: payload.new.id,
                user_id: payload.new.user_id
              }
            }));

            await supabase.from('notifications').insert(notifications);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [groupId]);

  const fetchGroupDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error) throw error;
      setGroup(data);
    } catch (error) {
      console.error('Error fetching group details:', error);
    }
  };

  const fetchMemberCount = async () => {
    try {
      const { count, error } = await supabase
        .from('group_members')
        .select('*', { count: 'exact' })
        .eq('group_id', groupId);

      if (error) throw error;
      setMemberCount(count || 0);
    } catch (error) {
      console.error('Error fetching member count:', error);
    }
  };

  const checkMembershipStatus = async () => {
    if (!user) return;
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberError) throw memberError;

      if (memberData) {
        setIsMember(true);
        setIsAdmin(memberData.role === 'admin');
        setIsSecondaryAdmin(memberData.role === 'secondary_admin');
      } else {
        setIsMember(false);
        setIsAdmin(false);
        setIsSecondaryAdmin(false);
      }
    } catch (error) {
      console.error('Error checking membership status:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPendingRequest = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('group_join_requests')
        .select(`
          id,
          status,
          created_at
        `)
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .single();

      if (error) {
        if (error.code === '406') {
          // Handle Not Acceptable error - likely due to auth or format issues
          console.error('Authentication or format error:', error);
          return;
        }
        throw error;
      }
      setHasRequestPending(!!data);
    } catch (error) {
      console.error('Error checking pending request:', error);
    }
  };

  const handleJoinRequest = async () => {
    if (!user || isMember || hasRequestPending) return;

    try {
      const { data: joinRequest, error } = await supabase
        .from('group_join_requests')
        .insert({
          group_id: groupId,
          user_id: user.id,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      
      // Get all admins of the group
      const { data: admins } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .in('role', ['admin', 'secondary_admin']);

      if (admins) {
        // Create notifications only for admins
        const notifications = admins.map((admin) => ({
          user_id: admin.user_id,
          title: 'New Join Request',
          message: `${user.user_metadata.username || 'A user'} has requested to join ${group?.name}`,
          type: 'info',
          read: false,
          metadata: {
            group_id: groupId,
            request_id: joinRequest.id,
            user_id: user.id
          }
        }));

        // Insert notifications only for admins
        await supabase.from('notifications').insert(notifications);
      }

      setHasRequestPending(true);
      toast.success('Join request sent successfully');
    } catch (error) {
      console.error('Error sending join request:', error);
      toast.error('Failed to send join request');
    }
  };

  const handleExitGroup = async () => {
    if (!user || !isMember || isAdmin) return;

    const confirmed = window.confirm('Are you sure you want to exit this group?');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;
      setIsMember(false);
      toast.success('Successfully left the group');
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('Failed to leave group');
    }
  };

  const handleRenameGroup = async () => {
    if ((!isAdmin && !isSecondaryAdmin) || !user || !newGroupName.trim()) return;

    try {
      const { error } = await supabase
        .from('groups')
        .update({ name: newGroupName.trim() })
        .eq('id', groupId);

      if (error) throw error;
      
      // Notify members
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);

      if (members) {
        const notifications = members.map(member => ({
          user_id: member.user_id,
          type: 'group_renamed',
          content: `Group has been renamed to "${newGroupName.trim()}"`,
          metadata: { group_id: groupId }
        }));

        await supabase.from('notifications').insert(notifications);
      }

      setShowRenameModal(false);
      setNewGroupName('');
      fetchGroupDetails();
      toast.success('Group renamed successfully');
    } catch (error) {
      console.error('Error renaming group:', error);
      toast.error('Failed to rename group');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!group) {
    return <div className="text-center text-gray-600">Group not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-4">
              {group.image_url ? (
                <img
                  src={group.image_url}
                  alt={group.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">{group.name}</h1>
                <p className="text-sm text-gray-500">
                  Created {new Date(group.created_at).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  {memberCount} / {group.max_members} members
                </p>
              </div>
            </div>

            {(isMember || isAdmin || isSecondaryAdmin) && (
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Settings className="w-6 h-6" />
              </button>
            )}
          </div>

          <p className="mt-4 text-gray-600">{group.description}</p>

          {!isMember && !hasRequestPending && (
            <button
              onClick={handleJoinRequest}
              className="mt-4 flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              <span>Request to Join</span>
            </button>
          )}

          {hasRequestPending && (
            <p className="mt-4 text-blue-600">Join request pending approval</p>
          )}
        </div>

        {showSettings && (
          <div className="border-t border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-lg">Group Settings</h2>
            
            {/* Member Settings */}
            {isMember && (
              <div className="space-y-2">
                <button
                  onClick={() => navigate(`/groups/${groupId}/chat`)}
                  className="w-full text-left p-2 hover:bg-gray-50 rounded flex items-center space-x-2"
                >
                  <span>Group Chat</span>
                </button>
                <button
                  onClick={() => navigate(`/groups/${groupId}/members`)}
                  className="w-full text-left p-2 hover:bg-gray-50 rounded flex items-center space-x-2"
                >
                  <Users className="w-5 h-5" />
                  <span>View Members</span>
                </button>
                {!isAdmin && (
                  <button
                    onClick={handleExitGroup}
                    className="w-full text-left p-2 hover:bg-red-50 rounded flex items-center space-x-2 text-red-600"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Exit Group</span>
                  </button>
                )}
              </div>
            )}

            {/* Admin Settings */}
            {(isAdmin || isSecondaryAdmin) && (
              <div className="space-y-2 border-t border-gray-200 pt-4">
                <h3 className="font-medium text-gray-700">Admin Controls</h3>
                <button
                  onClick={() => setShowRenameModal(true)}
                  className="w-full text-left p-2 hover:bg-gray-50 rounded flex items-center space-x-2"
                >
                  <Edit2 className="w-5 h-5" />
                  <span>Rename Group</span>
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="w-full text-left p-2 hover:bg-gray-50 rounded flex items-center space-x-2"
                >
                  <Settings className="w-5 h-5" />
                  <span>Group Settings</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Rename Group</h3>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Enter new group name"
              className="w-full p-2 border rounded mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowRenameModal(false);
                  setNewGroupName('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameGroup}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={!newGroupName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show join requests only to admins */}
      {(isAdmin || isSecondaryAdmin) && (
        <div className="mt-6">
          <GroupJoinRequests groupId={groupId} isAdmin={true} />
        </div>
      )}

      {/* Show members list */}
      <div className="mt-6">
        <GroupMembers groupId={groupId} isAdmin={isAdmin || isSecondaryAdmin} />
      </div>
    </div>
  );
}
