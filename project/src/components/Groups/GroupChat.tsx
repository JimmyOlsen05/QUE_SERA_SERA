import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Send, ImagePlus, Settings, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface Message {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  sender_id: string;
  profiles: {
    id: string;
    username: string;
    avatar_url: string;
  };
  username: string;
  avatar_url: string;
}

interface GroupMember {
  id?: string;
  username: string | undefined;
  avatar_url: string | undefined;
  is_admin?: boolean;
  is_secondary_admin?: boolean;
}

interface GroupInfo {
  name: string;
  description: string;
  created_at: string;
  image_url: string | null;
  created_by: string;
}

interface GroupChatProps {
  groupId: string;
}

export default function GroupChat({ groupId }: GroupChatProps) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [image, setImage] = useState<File | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSecondaryAdmin, setIsSecondaryAdmin] = useState(false);
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [usersToAdd, setUsersToAdd] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<{ id: string; username: string }[]>([]);
  const [isMember, setIsMember] = useState<boolean>(false);
  const [joinRequestSent, setJoinRequestSent] = useState<boolean>(false);
  const [joinRequestStatus, setJoinRequestStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  const fetchGroupInfo = async () => {
    try {
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select(`
          name,
          description,
          created_at,
          image_url,
          created_by
        `)
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;
      setGroupInfo(groupData);

      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select(`
          profiles:user_id (
            username,
            avatar_url
          ),
          is_admin,
          is_secondary_admin
        `)
        .eq('group_id', groupId);

      if (membersError) throw membersError;
      // Map the nested profile data to a flat structure
      const profiles: GroupMember[] = membersData.map(member => ({
        id: (member.profiles[0] as { id: string; username: string; avatar_url: string })?.id,
        username: member.profiles[0]?.username,
        avatar_url: member.profiles[0]?.avatar_url,
        is_admin: member.is_admin,
        is_secondary_admin: member.is_secondary_admin
      }));
      setGroupMembers(profiles);
    } catch (error) {
      console.error('Error fetching group info:', error);
    }
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('group_messages')
          .select(`
            *,
            profiles:sender_id(username, avatar_url)
          `)
          .eq('group_id', groupId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const subscription = supabase
      .channel('group_messages')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`
        }, 
        payload => {
          setMessages(current => [...current, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [groupId]);

  useEffect(() => {
    fetchGroupInfo();
  }, [groupId]);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!groupInfo) return;
      if (groupInfo.created_by === user?.id) {
        setIsAdmin(true);
      } else if (user?.id && groupInfo.created_by === user.id) {
        setIsSecondaryAdmin(true);
      }
    };

    checkAdminStatus();
  }, [groupInfo, user]);

  useEffect(() => {
    const fetchAvailableUsers = async () => {
      try {
        // Only fetch available users if there are group members
        if (groupMembers.length > 0) {
          const memberIds = groupMembers.map(member => member.id).filter(Boolean);
          const { data, error } = await supabase
            .from('profiles')
            .select('id, username')
            .not('id', 'in', `(${memberIds.join(',')})`);

          if (error) throw error;
          setAvailableUsers(data || []);
        } else {
          // If no group members, fetch all users
          const { data, error } = await supabase
            .from('profiles')
            .select('id, username');

          if (error) throw error;
          setAvailableUsers(data || []);
        }
      } catch (error) {
        console.error('Error fetching available users:', error);
      }
    };

    fetchAvailableUsers();
  }, [groupMembers]);

  const checkGroupMembership = async () => {
    try {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .from('group_members')
        .select('id, is_admin')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking group membership:', error);
        return false;
      }
      setIsMember(!!data);
      if (data?.is_admin) setIsAdmin(true);
      return !!data;
    } catch (error) {
      console.error('Error checking group membership:', error);
      return false;
    }
  };

  const checkJoinRequestStatus = async () => {
    try {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('group_join_requests')
        .select(`
          id,
          status,
          created_at,
          user_id
        `)
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        if (error.code === '406') {
          console.error('Authentication or format error:', error);
          return;
        }
        throw error;
      }
      
      if (data) {
        setJoinRequestSent(true);
        setJoinRequestStatus(data.status as 'pending' | 'approved' | 'rejected' | null);
      }
    } catch (error) {
      console.error('Error checking join request status:', error);
    }
  };

  const sendJoinRequest = async () => {
    try {
      if (!user?.id) return;

      const { error } = await supabase
        .from('group_join_requests')
        .insert({
          group_id: groupId,
          user_id: user.id,
          status: 'pending'
        });

      if (error) throw error;
      setJoinRequestSent(true);
      setJoinRequestStatus('pending');
    } catch (error) {
      console.error('Error sending join request:', error);
    }
  };

  useEffect(() => {
    checkGroupMembership();
    checkJoinRequestStatus();
  }, [user, groupId]);

  if (!isMember) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-4">Group Access Restricted</h2>
          {!user ? (
            <p className="text-gray-600 mb-4">Please sign in to request access to this group.</p>
          ) : joinRequestSent ? (
            <div>
              {joinRequestStatus === 'pending' && (
                <div>
                  <p className="text-yellow-600 mb-4">Your join request is pending admin approval.</p>
                  <div className="animate-pulse flex justify-center">
                    <div className="h-2 w-24 bg-yellow-200 rounded"></div>
                  </div>
                </div>
              )}
              {joinRequestStatus === 'rejected' && (
                <p className="text-red-600 mb-4">Your join request was declined.</p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">You need to be a member to access this group's chat.</p>
              <button
                onClick={sendJoinRequest}
                className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors"
              >
                Request to Join
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !image) || !user) return;

    try {
      // Check if user is a member of the group
      const isMember = await checkGroupMembership();
      if (!isMember) {
        console.error('User is not a member of this group');
        return;
      }

      let imageUrl = null;
      if (image) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from('group-images')
          .upload(fileName, image);

        if (uploadError) throw uploadError;
        imageUrl = data.path;
      }

      const { error } = await supabase
        .from('group_messages')
        .insert({
          group_id: groupId,
          sender_id: user.id,
          content: newMessage.trim(),
          image_url: imageUrl,
          created_at: new Date().toISOString()  // Add created_at timestamp
        });

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }

      setNewMessage('');
      setImage(null);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleDeleteGroup = async () => {
    try {
      // Delete all messages in the group
      await supabase
        .from('group_messages')
        .delete()
        .eq('group_id', groupId);

      // Delete all member associations
      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId);

      // Delete the group itself
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      // Notify members about group deletion
      // You would implement your notification system here
      
      // Redirect to groups list or home
      window.location.href = '/groups';
    } catch (error) {
      console.error('Error deleting group:', error);
    }
  };

  const handleRenameGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      const { error } = await supabase
        .from('groups')
        .update({ name: newGroupName })
        .eq('id', groupId);

      if (error) throw error;

      setGroupInfo(prev => prev ? { ...prev, name: newGroupName } : null);
      setNewGroupName('');
      // You would implement your notification system here
    } catch (error) {
      console.error('Error renaming group:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('group_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      // You would implement your notification system here
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleAssignSecondaryAdmin = async () => {
    if (!groupInfo || selectedUsers.length > 3) return;

    try {
      // Update secondary admins in the group
      const { error } = await supabase
        .from('groups')
        .update({ secondary_admins: selectedUsers })
        .eq('id', groupId);

      if (error) throw error;

      // Update member roles in group_members
      await Promise.all(
        selectedUsers.map(async (username) => {
          await supabase
            .from('group_members')
            .update({ is_secondary_admin: true })
            .eq('group_id', groupId)
            .eq('user_id', username);
        })
      );

      setSelectedUsers([]);
      // You would implement your notification system here
    } catch (error) {
      console.error('Error assigning secondary admins:', error);
    }
  };

  const handleAddUsers = async (userIds: string[]) => {
    try {
      const newMembers = userIds.map(userId => ({
        group_id: groupId,
        user_id: userId,
        is_admin: false,
        is_secondary_admin: false
      }));

      const { error } = await supabase
        .from('group_members')
        .insert(newMembers);

      if (error) throw error;

      // Refresh group members list
      await fetchGroupInfo();
      // You would implement your notification system here
    } catch (error) {
      console.error('Error adding users:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Group Header */}
      <div className="flex items-center gap-4 p-4 bg-white border-b">
        <img
          src={groupInfo?.image_url || 'https://via.placeholder.com/40'}
          alt={groupInfo?.name || 'Group'}
          className="w-12 h-12 rounded-full object-cover border-2 border-indigo-200"
        />
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900">{groupInfo?.name}</h2>
          <p className="text-sm text-gray-500">
            Created {groupInfo?.created_at ? new Date(groupInfo.created_at).toLocaleDateString() : ''}
          </p>
        </div>
        <button
          onClick={() => setShowProfileModal(true)}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <Settings className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="flex items-start space-x-3 group">
              <img
                src={message.profiles.avatar_url || 'https://via.placeholder.com/40'}
                alt={message.profiles.username}
                className="w-8 h-8 rounded-full"
              />
              <div className="flex-1">
                <p className="font-medium text-sm">{message.profiles.username}</p>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-800">{message.content}</p>
                    {message.image_url && (
                      <img src={message.image_url} alt="Message attachment" className="mt-2 max-w-xs rounded-lg" />
                    )}
                  </div>
                  {message.sender_id === user?.id && (
                    <button
                      onClick={() => handleDeleteMessage(message.id)}
                      className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-1 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <label className="cursor-pointer text-gray-500 hover:text-indigo-600">
            <ImagePlus className="w-6 h-6" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
            />
          </label>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() && !image}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        {image && (
          <div className="mt-2">
            <img
              src={URL.createObjectURL(image)}
              alt="Preview"
              className="h-20 rounded-lg object-contain"
            />
            <button
              type="button"
              onClick={() => setImage(null)}
              className="text-sm text-red-600 hover:text-red-700 mt-1"
            >
              Remove image
            </button>
          </div>
        )}
      </form>

      {/* Group Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[480px] max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Group Profile</h3>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Group Image and Basic Info */}
              <div className="flex flex-col items-center">
                <img
                  src={groupInfo?.image_url || 'https://via.placeholder.com/120'}
                  alt={groupInfo?.name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-indigo-200 mb-4"
                />
                <h4 className="text-2xl font-bold text-gray-900">{groupInfo?.name}</h4>
                <p className="text-gray-500">{groupInfo?.description}</p>
              </div>

              {/* Group Stats */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-600">{groupMembers.length}</p>
                  <p className="text-sm text-gray-600">Members</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-600">{messages.length}</p>
                  <p className="text-sm text-gray-600">Messages</p>
                </div>
              </div>

              {/* Members List */}
              <div>
                <h5 className="font-semibold text-gray-900 mb-3">Members</h5>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {groupMembers.map((member, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                      <img
                        src={member.avatar_url || 'https://via.placeholder.com/32'}
                        alt={member.username}
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{member.username}</p>
                        {member.is_admin && (
                          <span className="text-xs text-indigo-600">Admin</span>
                        )}
                        {member.is_secondary_admin && (
                          <span className="text-xs text-indigo-600 ml-2">Secondary Admin</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin Actions */}
              {(isAdmin || isSecondaryAdmin) && (
                <div className="pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowProfileModal(false);
                      setShowAdminSettings(true);
                    }}
                    className="w-full px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                  >
                    Manage Group Settings
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Group Settings</h3>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Group Name</label>
                <p className="mt-1 text-gray-900">{groupInfo?.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="mt-1 text-gray-900">{groupInfo?.description}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created At</label>
                <p className="mt-1 text-gray-900">{groupInfo?.created_at}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Group Image</label>
                <img
                  src={groupInfo?.image_url || 'https://via.placeholder.com/40'}
                  alt="Group Image"
                  className="w-10 h-10 rounded-full"
                />
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowAdminSettings(true)}
                  className="w-full px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Admin Settings
                </button>
              )}
              <button
                onClick={() => {/* Add leave group functionality */}}
                className="w-full px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Leave Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Settings Modal */}
      {showAdminSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Admin Settings</h3>
              <button 
                onClick={() => setShowAdminSettings(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">New Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Users to Add as Secondary Admins</label>
                <select
                  multiple
                  value={selectedUsers}
                  onChange={(e) => setSelectedUsers(Array.from(e.target.selectedOptions, option => option.value))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {groupMembers.map((member, index) => (
                    <option key={index} value={member.username}>{member.username}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleRenameGroup}
                className="w-full px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                Rename Group
              </button>
              <button
                onClick={handleAssignSecondaryAdmin}
                className="w-full px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                Assign Secondary Admins
              </button>
              <div>
                <label className="block text-sm font-medium text-gray-700">Add New Users</label>
                <select
                  multiple
                  value={usersToAdd}
                  onChange={(e) => setUsersToAdd(Array.from(e.target.selectedOptions, option => option.value))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {availableUsers.map((user, index) => (
                    <option key={index} value={user.id}>{user.username}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    handleAddUsers(usersToAdd);
                    setUsersToAdd([]);
                  }}
                  className="w-full mt-2 px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Add Selected Users
                </button>
              </div>
              <button
                onClick={handleDeleteGroup}
                className="w-full px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Delete Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}