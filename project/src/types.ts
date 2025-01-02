export interface Group {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  member_count?: number;
  is_member?: boolean;
  // ... any other existing properties
}

export interface Notification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  createdAt?: string;
  read?: boolean;
}