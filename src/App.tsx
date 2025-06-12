import React, { useState, useEffect } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const ydoc = new Y.Doc();
// Change the WebSocket provider URL to:
const provider = new WebsocketProvider(
  'wss://yjs-server.onrender.com', 
  'comments-room',
  ydoc
);

const yComments = ydoc.getArray('comments');

function App() {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [user] = useState(`User${Math.floor(Math.random() * 1000)}`);
  const [isConnected, setIsConnected] = useState(false);

  const addComment = () => {
    if (newComment.trim()) {
      yComments.push([
        {
          text: newComment,
          author: user,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          id: Date.now().toString(),
        },
      ]);
      setNewComment('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addComment();
    }
  };

  useEffect(() => {
    const updateComments = () => {
      setComments(yComments.toArray());
    };
  
    yComments.observe(updateComments);
    updateComments();
    
    provider.on('status', (event: { status: string }) => {
      setIsConnected(event.status === 'connected');
    });

    return () => yComments.unobserve(updateComments);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      {/* Main container with proper centering */}
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Real-Time Discussion</h1>
            <div className="flex items-center mt-1">
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-sm text-gray-600">
                {isConnected ? `Connected as ${user}` : 'Connecting...'}
              </span>
            </div>
          </div>
          <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full">
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </span>
        </div>

        {/* Input Field in Left Corner */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Share your thoughts..."
              rows={3}
              className="w-full px-4 py-3 focus:outline-none resize-none"
            />
          </div>
          <div className="flex justify-between items-center bg-gray-50 px-4 py-2 border-t border-gray-200">
            <span className="text-xs text-gray-500">Press Enter to post</span>
            <button
              onClick={addComment}
              disabled={!newComment.trim()}
              className={`px-4 py-2 rounded-md text-sm font-medium ${newComment.trim() ? 
                'bg-blue-600 text-white hover:bg-blue-700' : 
                'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
            >
              Post Comment
            </button>
          </div>
        </div>

        {/* Enhanced Comment List Section */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No comments yet</h3>
              <p className="mt-1 text-sm text-gray-500">Be the first to share what you think!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div 
                key={comment.id} 
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-fadeIn"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                          {comment.author.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{comment.author}</h4>
                        <span className="text-xs text-gray-500">{comment.timestamp}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700 pl-10">{comment.text}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default App;