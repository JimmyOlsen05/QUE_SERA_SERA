import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';

export default function Chat() {
  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      <ChatList />
      <ChatWindow />
    </div>
  );
}