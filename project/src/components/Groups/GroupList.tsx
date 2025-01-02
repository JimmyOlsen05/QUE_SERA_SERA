import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Group } from '../../types';
import { UserPlus, UserMinus } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface GroupListProps {
  selectedGroupId?: string;
  onSelectGroup: (group: Group) => void;
}

interface ExtendedGroup extends Group {
  is_member: boolean;
  member_count: number;
}

export default function GroupList({ selectedGroupId, onSelectGroup }: GroupListProps) {
  const { user } = useAuthStore();
  const [groups, setGroups] = useState<ExtendedGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroups();
  }, []);

  const checkMembership = async (groupId: string) => {
    if (!user?.id) return false;
    
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle();  

      if (error) {
        console.error('Error checking membership:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking membership:', error);
      return false;
    }
  };

  const fetchGroups = async () => {
    try {
      // Fetch groups with member counts using a subquery
      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select(`
          *,
          member_count:group_members(count)
        `);

      if (groupsError) throw groupsError;

      // Then check membership for each group
      const groupsWithMembership = await Promise.all(
        (groups || []).map(async (group) => {
          const is_member = await checkMembership(group.id);
          return {
            ...group,
            is_member,
            member_count: group.member_count?.[0]?.count || 0
          };
        })
      );

      setGroups(groupsWithMembership);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user?.id,
          role: 'member'
        });

      if (error) throw error;
      
      fetchGroups(); // Refresh the list
    } catch (error) {
      console.error('Error joining group:', error);
    }
  };

  const leaveGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      fetchGroups(); // Refresh the list
    } catch (error) {
      console.error('Error leaving group:', error);
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
    <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
      {groups.map((group) => (
        <div
          key={group.id}
          className={`p-4 hover:bg-gray-50 ${
            selectedGroupId === group.id ? 'bg-indigo-50' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center space-x-4 cursor-pointer"
              onClick={() => onSelectGroup(group)}
            >
              <img
                src={group.image_url || 'https://via.placeholder.com/40'}
                alt={group.name}
                className="w-12 h-12 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{group.name}</p>
                <p className="text-sm text-gray-500 truncate">{group.description}</p>
                <p className="text-xs text-gray-400">{group.member_count} members</p>
              </div>
            </div>
            
            {group.is_member ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  leaveGroup(group.id);
                }}
                className="text-red-600 hover:text-red-800"
                title="Leave group"
              >
                <UserMinus className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  joinGroup(group.id);
                }}
                className="text-indigo-600 hover:text-indigo-800"
                title="Join group"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      ))}
      {groups.length === 0 && (
        <div className="p-4 text-center text-gray-500">
          No groups found
        </div>
      )}
    </div>
  );
}