import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

export default function Welcome() {
  const { user } = useAuthStore();
  const [username, setUsername] = useState('');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fetchUsername = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setUsername(data.username);
      }
    };

    fetchUsername();

    // Hide message after 5 seconds
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [user]);

  if (!visible || !username) return null;

  return (
    <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg animate-fade-in">
      <p className="text-lg font-medium text-gray-800">
        Welcome back, <span className="text-indigo-600">{username}</span>! 👋
      </p>
    </div>
  );
} 