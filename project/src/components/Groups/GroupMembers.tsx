import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { UserX } from 'lucide-react';

interface GroupMember {
  id: string;
  username: string;
  avatar_url: string;
  role: string;
  joined_at: string;
}

interface GroupMembersProps {
  groupId: string;
  isAdmin: boolean;
}

export default function GroupMembers({ groupId, isAdmin }: GroupMembersProps) {
  const { user } = useAuthStore();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, [groupId]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          *,
          profiles:user_id(
            id,
            username,
            avatar_url
          )
        `)
        .eq('group_id', groupId);

      if (error) throw error;

      const formattedMembers = data.map(member => ({
        id: member.profiles.id,
        username: member.profiles.username,
        avatar_url: member.profiles.avatar_url,
        role: member.role,
        joined_at: member.created_at
      }));

      setMembers(formattedMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', memberId);

      if (error) throw error;
      
      setMembers(prev => prev.filter(member => member.id !== memberId));
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Group Members ({members.length})</h2>
      </div>
      <div className="divide-y">
        {members.map((member) => (
          <div key={member.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src={member.avatar_url || 'https://via.placeholder.com/40'}
                alt={member.username}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="font-medium">{member.username}</p>
                <p className="text-sm text-gray-500 capitalize">{member.role}</p>
              </div>
            </div>
            {isAdmin && member.id !== user?.id && (
              <button
                onClick={() => removeMember(member.id)}
                className="text-red-600 hover:text-red-800"
                title="Remove member"
              >
                <UserX className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 