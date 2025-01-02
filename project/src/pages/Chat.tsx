import { useState } from 'react';
import FriendsList from '../components/Chat/FriendsList';
import ChatMessages from '../components/Chat/ChatMessages';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

export default function Chat() {
  const { user } = useAuthStore();
  const [selectedChat, setSelectedChat] = useState<{
    roomId: string;
    friendId: string;
    username: string;
  } | null>(null);

  const handleSelectFriend = async (friendId: string, username: string) => {
    if (!user) return;

    try {
      // First check if the function exists and is callable
      console.log('Attempting to create chat room between:', user.id, 'and', friendId);
      
      const { data, error } = await supabase
        .rpc('get_or_create_chat_room', {
          user1_id: user.id,
          user2_id: friendId
        });

      if (error) {
        console.error('Supabase RPC error:', error);
        throw error;
      }

      console.log('Chat room response:', data);

      setSelectedChat({
        roomId: data,
        friendId,
        username
      });
    } catch (error) {
      console.error('Error getting/creating chat room:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="grid grid-cols-3 h-[calc(100vh-12rem)]">
          <div className="border-r">
            <FriendsList
              onSelectFriend={handleSelectFriend}
              selectedFriendId={selectedChat?.friendId}
            />
          </div>
          <div className="col-span-2">
            {selectedChat ? (
              <ChatMessages
                roomId={selectedChat.roomId}
                otherUsername={selectedChat.username}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                Select a friend to start chatting
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 