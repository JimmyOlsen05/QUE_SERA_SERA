import { Routes, Route, Navigate } from 'react-router-dom';
import Welcome from '../../components/Welcome';
import Home from './Home';
import Posts from './Posts';
import Friends from '../Friends';

export default function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Welcome />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard/home" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/posts" element={<Posts />} />
        <Route path="/friends" element={<Friends />} />
      </Routes>
    </div>
  );
} 