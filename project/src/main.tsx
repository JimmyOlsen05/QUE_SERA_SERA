import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import App from './App.tsx';
import './index.css';

// Initialize auth state
const initAuth = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    useAuthStore.getState().setUser(session.user);
  }
  useAuthStore.getState().setLoading(false);
};

// Initialize auth before rendering
initAuth().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
