import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

const handleCreatePost = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const { error } = await supabase
      .from('posts')
      .insert([
        {
          user_id: user?.id,
          content: postContent,
          created_at: new Date().toISOString(),
          // Add any other required fields
        }
      ])
      .select();

    if (error) throw error;
    
    // Reset form and handle success
    setPostContent('');
    // Handle success (e.g., refresh posts)
    
  } catch (error) {
    console.error('Error creating post:', error);
  }
}; 

const [postContent, setPostContent] = useState(''); 

const { user } = useAuthStore(); 

export default function CreatePost() {
  return (
    <form onSubmit={handleCreatePost}>
      {/* ... rest of your form content ... */}
    </form>
  );
} 