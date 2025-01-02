import { useState } from 'react';
import { Bell, Users } from 'lucide-react';
import NotificationList from './NotificationList';
import { JoinRequestsManager } from '../Groups/JoinRequestsManager';

interface NotificationSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  groupId?: string;
}

export default function NotificationSidePanel({ 
  isOpen, 
  onClose,
  groupId 
}: NotificationSidePanelProps) {
  const [activeTab, setActiveTab] = useState<'notifications' | 'joinRequests'>('notifications');

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-lg z-50 flex flex-col">
      <div className="flex justify-between items-center p-4 border-b">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center space-x-2 px-3 py-1 rounded-md ${
              activeTab === 'notifications' 
                ? 'bg-blue-100 text-blue-600' 
                : 'hover:bg-gray-100'
            }`}
          >
            <Bell size={18} />
            <span>Notifications</span>
          </button>
          <button
            onClick={() => setActiveTab('joinRequests')}
            className={`flex items-center space-x-2 px-3 py-1 rounded-md ${
              activeTab === 'joinRequests' 
                ? 'bg-blue-100 text-blue-600' 
                : 'hover:bg-gray-100'
            }`}
          >
            <Users size={18} />
            <span>Join Requests</span>
          </button>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'notifications' ? (
          <NotificationList onClose={onClose} />
        ) : (
          groupId ? (
            <JoinRequestsManager 
              groupId={groupId} 
              onRequestProcessed={() => {
                // Optionally handle request processing
              }} 
            />
          ) : (
            <div className="p-4 text-gray-500 text-center">
              No group selected to view join requests
            </div>
          )
        )}
      </div>
    </div>
  );
}
