import { useEffect, useState } from 'react';
import { Bell, Check, Trash2, X, UserPlus } from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
interface NotificationListProps {
  onClose: () => void;
}

export default function NotificationList({ onClose }: NotificationListProps) {
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
  } = useNotificationStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [groupAdminStatus, setGroupAdminStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Check if user is admin for the groups in notifications
  useEffect(() => {
    const checkGroupAdminStatus = async () => {
      if (!user) return;

      const groupIds = notifications
        .filter(n => n.type === 'group_member' && n.metadata?.group_id)
        .map(n => n.metadata?.group_id);

      const uniqueGroupIds = [...new Set(groupIds)];

      const adminStatus: Record<string, boolean> = {};
      
      for (const groupId of uniqueGroupIds) {
        if (!groupId) continue;
        
        const { data } = await supabase
          .from('group_members')
          .select('role')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .single();

        adminStatus[groupId] = data?.role === 'admin' || data?.role === 'secondary_admin';
      }

      setGroupAdminStatus(adminStatus);
    };

    checkGroupAdminStatus();
  }, [notifications, user]);

  const handleMarkAllRead = () => {
    markAllAsRead();
    onClose();
  };

  const handleClearAll = () => {
    clearAllNotifications();
    onClose();
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
    if (unreadCount <= 1) {
      onClose();
    }
  };

  const handleClearNotification = async (id: string) => {
    await clearNotification(id);
    if (notifications.length <= 1) {
      onClose();
    }
  };

  const handleJoinRequest = async (notification: any, approved: boolean) => {
    if (!notification.metadata?.request_id || !notification.metadata?.group_id) return;

    try {
      // Update the request status
      const { error: updateError } = await supabase
        .from('group_join_requests')
        .update({ status: approved ? 'approved' : 'rejected' })
        .eq('id', notification.metadata.request_id);

      if (updateError) throw updateError;

      // If approved, add the user to the group
      if (approved) {
        await supabase
          .from('group_members')
          .insert({
            group_id: notification.metadata.group_id,
            user_id: notification.metadata.user_id,
            role: 'member'
          });
      }

      // Clear the notification
      await handleClearNotification(notification.id);
    } catch (error) {
      console.error('Error processing join request:', error);
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (notification.type === 'group_member' && notification.metadata?.group_id) {
      navigate(`/groups/${notification.metadata.group_id}`);
      handleMarkAsRead(notification.id);
      onClose();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'group_member':
        return <UserPlus className="w-5 h-5 text-indigo-500" />;
      case 'success':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'error':
        return <X className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <Bell className="w-5 h-5 text-yellow-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const renderNotificationActions = (notification: any) => {
    const isGroupAdmin = notification.metadata?.group_id 
      ? groupAdminStatus[notification.metadata.group_id]
      : false;

    return (
      <div className="flex gap-2">
        {!notification.read && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMarkAsRead(notification.id);
            }}
            className="text-blue-600 hover:text-blue-900"
            title="Mark as read"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
        {notification.type === 'group_member' && 
         notification.metadata?.action === 'join_request' && 
         isGroupAdmin && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleJoinRequest(notification, true);
              }}
              className="text-green-600 hover:text-green-900"
              title="Accept request"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleJoinRequest(notification, false);
              }}
              className="text-red-600 hover:text-red-900"
              title="Decline request"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClearNotification(notification.id);
          }}
          className="text-red-600 hover:text-red-900"
          title="Remove notification"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="w-full max-w-md bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="font-medium">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleMarkAllRead}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Mark all as read
          </button>
          <button
            onClick={handleClearAll}
            className="text-sm text-red-600 hover:text-red-900"
          >
            Clear all
          </button>
        </div>
      </div>

      <div className="divide-y max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No notifications
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                !notification.read ? 'bg-blue-50' : ''
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {notification.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {notification.content}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                {renderNotificationActions(notification)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}