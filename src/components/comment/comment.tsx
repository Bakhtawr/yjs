import React, { useState, useEffect } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import CommentList from './CommentList';

const ydoc = new Y.Doc();
const provider = new WebsocketProvider(
  'wss://yjs-server.onrender.com', 
  'comments-room',
  ydoc
);

interface Comment {
  text: string;
  author: string;
  timestamp: string;
  id: string;
  replies: Comment[];
  isEditing?: boolean;
}

const yComments = ydoc.getArray<Comment>('comments');

function Comments() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [user] = useState(`User${Math.floor(Math.random() * 1000)}`);
  const [isConnected, setIsConnected] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [editingComment, setEditingComment] = useState<{id: string, text: string} | null>(null);

  const addComment = () => {
    if (!newComment.trim() && !replyText.trim()) return; 
  
    const newEntry: Comment = {
      text: replyingTo ? replyText : newComment, 
      author: user,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      id: Date.now().toString(),
      replies: []
    };
  
    if (replyingTo) {
      ydoc.transact(() => {
        const parentComment = yComments.toArray().find(c => c.id === replyingTo);
        if (parentComment) {
          parentComment.replies.push(newEntry);
        }
      });
      
      setReplyText(''); 
      setReplyingTo(null);
    } else {
      yComments.push([newEntry]);
      setNewComment('');
    }
  };

  const deleteComment = (id: string, isReply: boolean = false, parentId?: string) => {
    ydoc.transact(() => {
      if (isReply && parentId) {
        const parentComment = yComments.toArray().find(c => c.id === parentId);
        if (parentComment) {
          parentComment.replies = parentComment.replies.filter(reply => reply.id !== id);
        }
      } else {
        const index = yComments.toArray().findIndex(c => c.id === id);
        if (index !== -1) {
          yComments.delete(index, 1);
        }
      }
    });
  };

  const startEditing = (comment: Comment, isReply: boolean = false, parentId?: string) => {
    if (isReply && parentId) {
      const parentComment = yComments.toArray().find(c => c.id === parentId);
      if (parentComment) {
        const replyIndex = parentComment.replies.findIndex(r => r.id === comment.id);
        if (replyIndex !== -1) {
          parentComment.replies[replyIndex].isEditing = true;
        }
      }
    } else {
      const index = yComments.toArray().findIndex(c => c.id === comment.id);
      if (index !== -1) {
        yComments.get(index).isEditing = true;
      }
    }
    setEditingComment({ id: comment.id, text: comment.text });
  };

  const saveEdit = (isReply: boolean = false, parentId?: string) => {
    if (!editingComment) return;

    ydoc.transact(() => {
      if (isReply && parentId) {
        const parentComment = yComments.toArray().find(c => c.id === parentId);
        if (parentComment) {
          const replyIndex = parentComment.replies.findIndex(r => r.id === editingComment.id);
          if (replyIndex !== -1) {
            parentComment.replies[replyIndex].text = editingComment.text;
            parentComment.replies[replyIndex].isEditing = false;
          }
        }
      } else {
        const index = yComments.toArray().findIndex(c => c.id === editingComment.id);
        if (index !== -1) {
          yComments.get(index).text = editingComment.text;
          yComments.get(index).isEditing = false;
        }
      }
    });

    setEditingComment(null);
  };

  const cancelEdit = (isReply: boolean = false, parentId?: string) => {
    ydoc.transact(() => {
      if (isReply && parentId) {
        const parentComment = yComments.toArray().find(c => c.id === parentId);
        if (parentComment) {
          const replyIndex = parentComment.replies.findIndex(r => r.id === editingComment?.id);
          if (replyIndex !== -1) {
            parentComment.replies[replyIndex].isEditing = false;
          }
        }
      } else {
        const index = yComments.toArray().findIndex(c => c.id === editingComment?.id);
        if (index !== -1) {
          yComments.get(index).isEditing = false;
        }
      }
    });

    setEditingComment(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addComment();
    }
  };

  useEffect(() => {
    const updateComments = () => {
      try {
        setComments(yComments.toArray());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update comments');
      }
    };
  
    yComments.observe(updateComments);
    updateComments();
    
    provider.on('status', (event: { status: string }) => {
      setIsConnected(event.status === 'connected');
    });

    return () => {
      yComments.unobserve(updateComments);
      provider.off('status');
    };
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => setError(null)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
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
          <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-medium">
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </span>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md">
          <div className="p-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={replyingTo ? "Write your reply..." : "Share your thoughts..."}
              rows={3}
              className="w-full px-4 py-3 focus:outline-none resize-none"
            />
          </div>
          <div className="flex justify-between items-center bg-gray-50 px-4 py-2 border-t border-gray-200">
            {replyingTo && (
              <button
                onClick={() => setReplyingTo(null)}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel reply
              </button>
            )}
            {!replyingTo && (
              <span className="text-xs text-gray-500">Press Enter to post</span>
            )}
            <button
              onClick={addComment}
              disabled={!newComment.trim()}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                newComment.trim() 
                  ? 'bg-blue-600 text-white shadow hover:bg-blue-700 hover:shadow-md' 
                  : 'bg-gray-200 text-black cursor-not-allowed'
              }`}
            >
              {replyingTo ? 'Post Reply' : 'Post Comment'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center transition-all duration-200 hover:shadow-md">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No comments yet</h3>
              <p className="mt-1 text-sm text-gray-500">Be the first to share what you think!</p>
            </div>
          ) : (
            <CommentList
              comments={comments}
              user={user}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyText={replyText}
              setReplyText={setReplyText}
              editingComment={editingComment}
              setEditingComment={setEditingComment}
              onAddComment={addComment}
              onDeleteComment={deleteComment}
              onStartEditing={startEditing}
              onSaveEdit={saveEdit}
              onCancelEdit={cancelEdit}
            />
          )}
        </div>
      </div>

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

export default Comments;