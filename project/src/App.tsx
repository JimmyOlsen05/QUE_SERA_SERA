import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Friends from './pages/Friends';
import Chat from './pages/Chat';
import Groups from './pages/Groups';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import PrivateRoute from './components/PrivateRoute';
import Home from './pages/Dashboard/Home';
import Posts from './pages/Dashboard/Posts';
import GroupChatWrapper from './components/Groups/GroupChatWrapper';
import NotificationSidePanel from './components/Notifications/NotificationSidePanel';

function App() {
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [currentGroupId, setCurrentGroupId] = useState<string | undefined>();

  return (
    <Router>
      <div className="relative">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard/*"
            element={
              <PrivateRoute>
                <Layout onNotificationClick={() => setIsNotificationPanelOpen(true)}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/home" element={<Home />} />
                    <Route path="/posts" element={<Posts />} />
                    <Route path="/friends" element={<Friends />} />
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/groups" element={<Groups onGroupSelect={setCurrentGroupId} />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/group-chat/:groupId" element={<GroupChatWrapper />} />
                  </Routes>
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>
        
        <NotificationSidePanel 
          isOpen={isNotificationPanelOpen}
          onClose={() => setIsNotificationPanelOpen(false)}
          groupId={currentGroupId}
        />
      </div>
    </Router>
  );
}

export default App;