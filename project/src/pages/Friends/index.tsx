import FriendRequests from './components/FriendRequests';
import PeopleYouMayKnow from './components/PeopleYouMayKnow';
import FriendsList from './components/FriendsList';

export default function Friends() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <FriendRequests />
        <PeopleYouMayKnow />
      </div>
      <FriendsList />
    </div>
  );
} 