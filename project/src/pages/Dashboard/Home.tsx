import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Users, BookOpen, Calendar, Bell, MessageSquare, UserPlus } from 'lucide-react';
import type { Profile } from '../../types/database.types';

export default function Home() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({
    friendCount: 0,
    pendingRequests: 0,
    unreadMessages: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch user profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        }

        // Fetch stats
        const [{ count: friendCount }, { count: requestCount }] = await Promise.all([
          supabase
            .from('friends')
            .select('*', { count: 'exact', head: true })
            .or(`user_id1.eq.${user.id},user_id2.eq.${user.id}`),
          supabase
            .from('friend_requests')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', user.id)
            .eq('status', 'pending')
        ]);

        setStats({
          friendCount: friendCount || 0,
          pendingRequests: requestCount || 0,
          unreadMessages: 3 // Placeholder - implement real message count
        });

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {profile?.username}!</h1>
        <p className="text-indigo-100">Stay connected with your university community</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Friends</p>
              <p className="text-2xl font-bold">{stats.friendCount}</p>
            </div>
            <Users className="h-10 w-10 text-indigo-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Friend Requests</p>
              <p className="text-2xl font-bold">{stats.pendingRequests}</p>
            </div>
            <UserPlus className="h-10 w-10 text-indigo-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Unread Messages</p>
              <p className="text-2xl font-bold">{stats.unreadMessages}</p>
            </div>
            <MessageSquare className="h-10 w-10 text-indigo-600" />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex flex-col items-center">
                <img
                  src={profile?.avatar_url || 'https://via.placeholder.com/150'}
                  alt={profile?.username}
                  className="w-32 h-32 rounded-full mb-4"
                />
                <h2 className="text-xl font-bold text-gray-900">{profile?.username}</h2>
                <p className="text-gray-600">{profile?.university}</p>
                {profile?.bio && (
                  <p className="text-gray-600 mt-4 text-center">{profile.bio}</p>
                )}
              </div>
              <div className="mt-6 border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
                <div className="space-y-3">
                  <a href="/dashboard/friends" className="flex items-center text-gray-700 hover:text-indigo-600">
                    <Users className="h-5 w-5 mr-3" />
                    Find Friends
                  </a>
                  <a href="/dashboard/posts" className="flex items-center text-gray-700 hover:text-indigo-600">
                    <BookOpen className="h-5 w-5 mr-3" />
                    View Posts
                  </a>
                  <a href="/dashboard/events" className="flex items-center text-gray-700 hover:text-indigo-600">
                    <Calendar className="h-5 w-5 mr-3" />
                    Upcoming Events
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notifications */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Bell className="h-5 w-5 mr-2 text-indigo-600" />
              Recent Activity
            </h2>
            <div className="space-y-4">
              <div className="flex items-start p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-gray-800">You have {stats.pendingRequests} new friend requests</p>
                  <p className="text-sm text-gray-500 mt-1">Just now</p>
                </div>
              </div>
              <div className="flex items-start p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-gray-800">New event in your university: "Spring Festival 2024"</p>
                  <p className="text-sm text-gray-500 mt-1">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-gray-800">Your friend shared a new post</p>
                  <p className="text-sm text-gray-500 mt-1">5 hours ago</p>
                </div>
              </div>
            </div>
          </div>

          {/* Suggested Connections */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">People You May Know</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((_, i) => (
                <div key={i} className="flex items-center p-4 bg-gray-50 rounded-lg">
                  <img
                    src={`https://source.unsplash.com/100x100/?portrait&${i}`}
                    alt="Suggested connection"
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">Student {i + 1}</h3>
                    <p className="text-sm text-gray-500">{profile?.university}</p>
                  </div>
                  <button className="text-indigo-600 hover:text-indigo-800">
                    <UserPlus className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 