import ProfileSettings from './components/ProfileSettings';
import SecuritySettings from './components/SecuritySettings';

export default function Settings() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <ProfileSettings />
      <SecuritySettings />
    </div>
  );
}