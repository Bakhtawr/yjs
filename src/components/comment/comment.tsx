import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { generateColorFromUID } from '../../utils/auth/authUtils';
import { useCommentsSetup } from '../../hooks/useCommentsSetup';
import { useCommentActions } from '../../hooks/useCommentActions';

import CommentList from './commentlist';
import PresenceIndicator from './PresenceIndicator';
import NotificationsPanel from './NotificationsPanel';
import type { User } from '../../yjsSetup';
import { updateCursorPosition } from '../../utils/yjs/presenceUtils'; 

import CommentInput from './commentInput';

// types.ts
export interface Comment {
  id: string;
  text: string;
  author: User;
  timestamp: string;
  replies?: Comment[];
  isEditing?: boolean;
  updatedAt?: string;
  mentions?: { userId: string; userName: string }[];
}

export type Notification = {
  id: string;
  type: "mention" | "reply";
  commentId: string;
  recipientId: string;
  author: User;
  read: boolean;
  timestamp: string;
};


function Comments() {
  const { currentUser, loginWithGoogle } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]); // Moved before useCommentActions

  const {
    comments,
    users,
    isConnected,
    provider,
    isProcessing,
    setIsProcessing,
  } = useCommentsSetup(user);

  const {
    addComment,
    startEditing,
    saveEdit,
    cancelEdit,
    deleteComment,
    editingComment,
    setEditingComment
  } = useCommentActions(
    user,
    provider,
    comments,
    users,
    notifications,
    setNotifications,
    setError,
    setIsProcessing
  );

  // Initialize user from Firebase auth
  useEffect(() => {
    if (currentUser) {
      const userData: User = {
        id: currentUser.uid,
        name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous',
        color: generateColorFromUID(currentUser.uid),
        avatar: currentUser.photoURL || undefined
      };
      setUser(userData);
    }
  }, [currentUser]);

  const handleReplyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReplyText(e.target.value);
    if (provider) updateCursorPosition(provider, { x: e.target.selectionStart, y: 0 });
  };

  // Keyboard handlers
  const handleMainCommentKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!replyingTo) {
        addComment(newComment, null);
        setNewComment('');
      }
    }
  };

  const handleReplyKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addComment(replyText, replyingTo);
      setReplyText('');
      setReplyingTo(null);
    }
  };

  // Notification handling
  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Wrapper for CommentList's onAddComment
  const handleAddComment = useCallback(() => {
    if (replyingTo) {
      addComment(replyText, replyingTo);
      setReplyText('');
      setReplyingTo(null);
    } else {
      addComment(newComment, null);
      setNewComment('');
    }
  }, [addComment, newComment, replyText, replyingTo]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Please sign in to participate in the discussion</h2>
          <p className="text-gray-600 mb-6">You need to be authenticated to view and post comments.</p>
          <button
            onClick={loginWithGoogle}
            className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

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
                {isConnected ? `Connected as ${user.name}` : 'Connecting...'}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <PresenceIndicator users={users} currentUser={user} />
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notifications.filter(n => !n.read && n.recipientId === user.id).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {notifications.filter(n => !n.read && n.recipientId === user.id).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {showNotifications && (
          <NotificationsPanel
            notifications={notifications.filter(n => n.recipientId === user.id)}
            onMarkAsRead={markNotificationAsRead}
            onClearAll={clearAllNotifications}
            onClose={() => setShowNotifications(false)}
            currentUserId={user.id}
          />
        )}

        {!replyingTo && (
      <CommentInput
      value={newComment}
      onChange={(e) => setNewComment(e.target.value)}
      onKeyPress={handleMainCommentKeyPress}
      onSubmit={() => {
        addComment(newComment, null);
        setNewComment('');
      }}
      isProcessing={isProcessing}
    />
    
     
      
        )}

        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center transition-all duration-200 hover:shadow-md">
              
              <h3 className="mt-2 text-sm font-medium text-gray-900">No comments yet</h3>
              <p className="mt-1 text-sm text-gray-500">Be the first to share what you think!</p>
            </div>
          ) : (
            <CommentList
              comments={comments}
              user={user}
              users={users}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyText={replyText}
              onReplyChange={handleReplyChange}
              onReplyKeyPress={handleReplyKeyPress}
              editingComment={editingComment}
              setEditingComment={setEditingComment}
              onAddComment={handleAddComment} 
              onDeleteComment={deleteComment}
              onStartEditing={startEditing}
              onSaveEdit={saveEdit}
              onCancelEdit={cancelEdit}
            />
          )}
        </div>
      </div>

     
    </div>
  );
}

export default Comments;