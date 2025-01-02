import { useNotificationStore } from '../../store/notificationStore';

type NotificationType = 'info' | 'success' | 'warning' | 'error';

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: NotificationType = 'info'
) => {
  const { addNotification } = useNotificationStore.getState();
  
  await addNotification({
    id: crypto.randomUUID(),
    user_id: userId,
    title,
    message,
    type,
    read: false,
    created_at: new Date().toISOString()
  });
};

// Helper functions for different notification types
export const showSuccessNotification = (userId: string, title: string, message: string) =>
  createNotification(userId, title, message, 'success');

export const showErrorNotification = (userId: string, title: string, message: string) =>
  createNotification(userId, title, message, 'error');

export const showWarningNotification = (userId: string, title: string, message: string) =>
  createNotification(userId, title, message, 'warning');

export const showInfoNotification = (userId: string, title: string, message: string) =>
  createNotification(userId, title, message, 'info'); 