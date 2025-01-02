import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { UserPlus } from 'lucide-react';
import type { Profile } from '../../../types/database.types';

export default function PeopleYouMayKnow() {
  const { user } = useAuthStore();
  const [people, setPeople] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const fetchUserProfileAndPeople = async () => {
      if (!user) return;
      
      try {
        // First get current user's profile to know their university
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        setUserProfile(profile);

        // Get existing friends and requests to exclude them
        const { data: friendships } = await supabase
          .from('friends')
          .select('user_id1, user_id2')
          .or(`user_id1.eq.${user.id},user_id2.eq.${user.id}`);

        const { data: requests } = await supabase
          .from('friend_requests')
          .select('sender_id, receiver_id')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

        // Collect IDs to exclude
        const excludeIds = new Set([user.id]);
        friendships?.forEach(f => {
          excludeIds.add(f.user_id1);
          excludeIds.add(f.user_id2);
        });
        requests?.forEach(r => {
          excludeIds.add(r.sender_id);
          excludeIds.add(r.receiver_id);
        });

        // Get profiles not in excludeIds, prioritizing same university
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('*')
          .not('id', 'in', `(${Array.from(excludeIds).join(',')})`)
          .order('university', { ascending: profile.university ? false : true })
          .limit(20);

        if (error) throw error;

        // Sort profiles: same university first, then others
        const sortedProfiles = profiles.sort((a, b) => {
          if (a.university === profile.university && b.university !== profile.university) return -1;
          if (a.university !== profile.university && b.university === profile.university) return 1;
          return 0;
        });

        setPeople(sortedProfiles);
      } catch (error) {
        console.error('Error fetching people:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfileAndPeople();
  }, [user]);

  const handleSendRequest = async (receiverId: string) => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user?.id,
          receiver_id: receiverId,
          status: 'pending'
        });

      if (error) throw error;

      // Remove person from suggestions
      setPeople(people.filter(person => person.id !== receiverId));
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">People You May Know</h2>
      <div className="space-y-4">
        {people.length === 0 ? (
          <p className="text-gray-500">No suggestions available.</p>
        ) : (
          people.map(person => (
            <div key={person.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <img
                  src={person.avatar_url || 'https://via.placeholder.com/40'}
                  alt={person.username}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <h3 className="font-semibold">{person.username}</h3>
                  <p className="text-sm text-gray-500">
                    {person.university}
                    {person.university === userProfile?.university && (
                      <span className="ml-2 text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                        Same University
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleSendRequest(person.id)}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full"
                title="Send friend request"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 