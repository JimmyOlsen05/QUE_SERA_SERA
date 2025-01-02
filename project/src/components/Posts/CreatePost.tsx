import React, { useState } from 'react';
import { ImagePlus, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

export default function CreatePost() {
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !image) return;

    setLoading(true);
    try {
      let imageUrl = null;
      if (image) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from('post-images')
          .upload(fileName, image);

        if (uploadError) throw uploadError;
        imageUrl = data.path;
      }

      const { error } = await supabase.from('posts').insert({
        user_id: user?.id,
        content,
        image_url: imageUrl,
      });

      if (error) throw error;
      setContent('');
      setImage(null);
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 mb-6">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
        className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        rows={3}
      />
      
      <div className="flex items-center justify-between mt-3">
        <label className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-indigo-600">
          <ImagePlus className="w-5 h-5" />
          <span>Add Image</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />
        </label>
        
        <button
          type="submit"
          disabled={loading || (!content.trim() && !image)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {loading ? 'Posting...' : 'Post'}
        </button>
      </div>
      
      {image && (
        <div className="mt-3">
          <img
            src={URL.createObjectURL(image)}
            alt="Preview"
            className="max-h-48 rounded-lg"
          />
          <button
            type="button"
            onClick={() => setImage(null)}
            className="mt-2 text-sm text-red-600 hover:text-red-700"
          >
            Remove image
          </button>
        </div>
      )}
    </form>
  );
}