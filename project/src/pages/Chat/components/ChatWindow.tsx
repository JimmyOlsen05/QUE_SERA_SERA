import { Send } from 'lucide-react';

export default function ChatWindow() {
  return (
    <div className="flex-1 bg-white rounded-lg shadow flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">Select a chat to start messaging</h2>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {/* Messages will be displayed here */}
      </div>

      <div className="p-4 border-t">
        <form className="flex gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}