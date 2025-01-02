import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import type { Post, Profile } from '../../types/database.types';
import { MoreVertical, Trash2, Heart, MessageCircle, Share2 } from 'lucide-react';

interface PostCardProps {
  post: Post & { profiles: Profile };
  onDelete?: () => void;
}

export default function PostCard({ post, onDelete }: PostCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const { user } = useAuthStore();
  
  const handleLike = async () => {
    if (!user) return;
    
    try {
      if (isLiked) {
        await supabase
          .from('likes')
          .delete()
          .match({ post_id: post.id, user_id: user.id });
        setLikes(prev => prev - 1);
      } else {
        await supabase
          .from('likes')
          .insert({ post_id: post.id, user_id: user.id });
        setLikes(prev => prev + 1);
      }
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleDelete = async () => {
    if (!user || user.id !== post.user_id) return;
    
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .match({ id: post.id });
      
      if (error) throw error;
      onDelete?.();
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <img
            src={post.profiles.avatar_url || 'https://via.placeholder.com/40'}
            alt={post.profiles.username}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <h3 className="font-semibold text-gray-900">
              {post.profiles.username}
            </h3>
            <p className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        {user?.id === post.user_id && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <MoreVertical className="w-5 h-5 text-gray-500" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                <button
                  onClick={handleDelete}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-gray-800 mb-4">{post.content}</p>
      
      {post.image_url && (
        <img
          src={`${supabase.storage.from('post-images').getPublicUrl(post.image_url).data.publicUrl}`}
          alt="Post"
          className="rounded-lg mb-4 max-h-96 w-full object-cover"
        />
      )}

      <div className="flex items-center justify-between pt-4 border-t">
        <button
          onClick={handleLike}
          className={`flex items-center space-x-2 ${
            isLiked ? 'text-red-600' : 'text-gray-500'
          } hover:text-red-600`}
        >
          <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          <span>{likes}</span>
        </button>

        <button className="flex items-center space-x-2 text-gray-500 hover:text-indigo-600">
          <MessageCircle className="w-5 h-5" />
          <span>Comment</span>
        </button>

        <button className="flex items-center space-x-2 text-gray-500 hover:text-indigo-600">
          <Share2 className="w-5 h-5" />
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}