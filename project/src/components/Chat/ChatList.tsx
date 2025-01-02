import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface ChatRoom {
  id: string;
  last_message?: {
    content: string;
    created_at: string;
  };
  other_user: {
    username: string;
    avatar_url: string;
  };
}

interface ChatListProps {
  onSelectChat: (roomId: string, username: string) => void;
  selectedRoomId?: string;
}

interface ChatParticipant {
  chat_room_id: string;
  chat_rooms: {
    id: string;
    messages: Array<{
      content: string;
      created_at: string;
    }>;
  };
  profiles: {
    username: string;
    avatar_url: string;
  };
}

export default function ChatList({ onSelectChat, selectedRoomId }: ChatListProps) {
  const { user } = useAuthStore();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchChatRooms = async () => {
      try {
        const { data: rooms, error } = await supabase
          .from('chat_participants')
          .select(`
            chat_room_id,
            chat_rooms:chat_rooms!inner (
              id,
              messages:messages (
                content,
                created_at
              )
            ),
            profiles:profiles!inner (
              username,
              avatar_url
            )
          `)
          .eq('user_id', user.id);

        if (error) throw error;

        // Transform the data
        const formattedRooms = ((rooms as unknown as Array<ChatParticipant>) ?? []).map(room => ({
          id: room.chat_room_id,
          last_message: room.chat_rooms?.messages?.[0],
          other_user: room.profiles
        }));

        setChatRooms(formattedRooms);
      } catch (error) {
        console.error('Error fetching chat rooms:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChatRooms();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {chatRooms.map((room) => (
        <div
          key={room.id}
          onClick={() => onSelectChat(room.id, room.other_user.username)}
          className={`p-4 cursor-pointer hover:bg-gray-50 ${
            selectedRoomId === room.id ? 'bg-indigo-50' : ''
          }`}
        >
          <div className="flex items-center space-x-4">
            <img
              src={room.other_user.avatar_url || 'https://via.placeholder.com/40'}
              alt={room.other_user.username}
              className="w-12 h-12 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">
                {room.other_user.username}
              </p>
              {room.last_message && (
                <p className="text-sm text-gray-500 truncate">
                  {room.last_message.content}
                </p>
              )}
            </div>
            {room.last_message && (
              <div className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(room.last_message.created_at), {
                  addSuffix: true,
                })}
              </div>
            )}
          </div>
        </div>
      ))}
      {chatRooms.length === 0 && (
        <p className="p-4 text-center text-gray-500">
          No conversations yet
        </p>
      )}
    </div>
  );
} 