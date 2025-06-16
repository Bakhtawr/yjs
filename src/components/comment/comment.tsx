import * as Y from 'yjs';
import { useState, useEffect } from 'react';
import { ydoc, yComments, toComment, createYComment, type User, type Comment, createYCommentFromJSON } from '../../yjsSetup';
import { setupWebsocketProvider } from '../../yjsSetup';
import { findComment } from '../../utils/commentUtils';
import { setupUserPresence, getActiveUsers, updateCursorPosition, updateActiveComment } from '../../utils/presenceUtils';
import { checkForMentions, checkForReplies, type Notification } from '../../utils/notificationUtils';
import CommentList from './commentlist';
import PresenceIndicator from './PresenceIndicator';
import NotificationsPanel from './NotificationsPanel';
import { useAuth } from '../../contexts/AuthContext';
import { generateColorFromUID } from '../../utils/authUtils';
import { loadCommentsFromFirestore, saveCommentsToFirestore } from '../../utils/firestoreUtils';

function Comments() {
  const { currentUser, loginWithGoogle } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [editingComment, setEditingComment] = useState<{id: string, text: string} | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [provider, setProvider] = useState<any>(null);

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

  // Initialize YJS provider and setup presence
  useEffect(() => {
    if (!user) return;

    const setup = async () => {
      try {
        const savedComments = await loadCommentsFromFirestore('comment-room-yjs');
        ydoc.transact(() => {
          yComments.delete(0, yComments.length);
          savedComments.forEach((c: any) => {
            yComments.push([createYCommentFromJSON(c)]);
          });
        });

        const wsProvider = setupWebsocketProvider(ydoc, user, 'comment-room-yjs');
        setProvider(wsProvider);
        setupUserPresence(wsProvider, user);

        wsProvider.on('status', (event: { status: string }) => {
          setIsConnected(event.status === 'connected');
        });

        // Observe comments changes
        const observer = () => {
          setComments(yComments.toArray().map(toComment));
        };

        yComments.observe(observer);
        return () => yComments.unobserve(observer);
      } catch (err) {
        setError('Failed to initialize connection. Please refresh the page.');
        console.error('Initialization error:', err);
      }
    };

    setup();
  }, [user]);

  // Persist comments to Firestore
  useEffect(() => {
    if (!provider) return;
  
    const persist = () => {
      const data = yComments.toArray().map((c) => c.toJSON());
      saveCommentsToFirestore('comment-room-yjs', data);
    };
  
    yComments.observeDeep(persist);
    return () => yComments.unobserveDeep(persist);
  }, [provider]);

  // Update active users list
  useEffect(() => {
    if (!provider || !user) return;
    
    const handleAwarenessChange = () => {
      setUsers(getActiveUsers(provider));
    };
    
    provider.awareness.on('change', handleAwarenessChange);
    return () => provider.awareness.off('change', handleAwarenessChange);
  }, [provider, user]);

  const handleMainCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewComment(value);
    
    // Update cursor position for presence
    if (provider) {
      updateCursorPosition(provider, { x: e.target.selectionStart, y: 0 });
    }
  };

  const handleReplyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReplyText(e.target.value);
    
    // Update cursor position for presence
    if (provider) {
      updateCursorPosition(provider, { x: e.target.selectionStart, y: 0 });
    }
  };

  const handleMainCommentKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!replyingTo) {
        addComment();
      }
    }
  };

  const handleReplyKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addComment();
    }
  };

  const addComment = () => {
    if (!user) return;
    
    const text = replyingTo ? replyText.trim() : newComment.trim();
    if (!text) return;
    
    const yComment = createYComment(text, user);
    
    ydoc.transact(() => {
      if (replyingTo) {
        const found = findComment(replyingTo, yComments.toArray().map(toComment));
        if (found) {
          const parentIndex = yComments.toArray().findIndex(c => {
            const comment = toComment(c);
            return comment.id === replyingTo;
          });
          if (parentIndex !== -1) {
            const parent = yComments.get(parentIndex);
            const replies = parent.get('replies') as Y.Array<Y.Map<any>>;
            replies.push([yComment]);
            
            // Check for reply notifications
            const parentComment = toComment(parent);
            const replyNotifications = checkForReplies(
              toComment(yComment),
              parentComment,
              user,
              notifications
            ).map(notification => ({
              ...notification,
              recipientId: parentComment.author.id 
            }));
            
            setNotifications(prev => [...prev, ...replyNotifications]);
          }
        }
      } else {
        yComments.push([yComment]);
      }
      
      // Check for mention notifications
      const mentionNotifications = checkForMentions(
        toComment(yComment),
        user,
        users,
        notifications
      ).map(notification => {
        const mention = yComment.get('mentions').find((m: any) => 
          notification.content === yComment.get('text').substring(m.position, m.position + m.length)
        );
        return {
          ...notification,
          recipientId: mention.userId
        };
      });
      
      setNotifications(prev => [...prev, ...mentionNotifications]);
    });
    
    // Reset form fields
    setReplyText('');
    setReplyingTo(null);
    setNewComment('');
    
    // Update presence information
    if (provider) updateActiveComment(provider, null);
  };

  const startEditing = (comment: Comment) => {
    if (!user || comment.author.id !== user.id) return;
    
    setEditingComment({ id: comment.id, text: comment.text });
    if (provider) updateActiveComment(provider, comment.id);
    
    ydoc.transact(() => {
      // Search in main comments first
      let commentIndex = yComments.toArray().findIndex(c => {
        const cComment = toComment(c);
        return cComment.id === comment.id;
      });
  
      if (commentIndex !== -1) {
        const commentMap = yComments.get(commentIndex);
        commentMap.set('isEditing', true);
      } else {
        // If not found, search in replies
        for (let i = 0; i < yComments.length; i++) {
          const parent = yComments.get(i);
          const replies = parent.get('replies') as Y.Array<Y.Map<any>>;
          
          const replyIndex = replies.toArray().findIndex(r => {
            const replyComment = toComment(r);
            return replyComment.id === comment.id;
          });
  
          if (replyIndex !== -1) {
            const replyMap = replies.get(replyIndex);
            replyMap.set('isEditing', true);
            break;
          }
        }
      }
    });
  };

  const saveEdit = () => {
    if (!editingComment || !user) return;
  
    ydoc.transact(() => {
      // Find the comment in the main comments array
      let commentIndex = yComments.toArray().findIndex(c => {
        const cComment = toComment(c);
        return cComment.id === editingComment.id;
      });
  
      if (commentIndex !== -1) {
        const commentMap = yComments.get(commentIndex);
        commentMap.set('text', editingComment.text);
        commentMap.set('isEditing', false);
        commentMap.set('updatedAt', new Date().toISOString());
      } else {
        // If not found in main comments, search in replies
        for (let i = 0; i < yComments.length; i++) {
          const parent = yComments.get(i);
          const replies = parent.get('replies') as Y.Array<Y.Map<any>>;
          
          const replyIndex = replies.toArray().findIndex(r => {
            const replyComment = toComment(r);
            return replyComment.id === editingComment.id;
          });
  
          if (replyIndex !== -1) {
            const replyMap = replies.get(replyIndex);
            replyMap.set('text', editingComment.text);
            replyMap.set('isEditing', false);
            replyMap.set('updatedAt', new Date().toISOString());
            break;
          }
        }
      }
    });
  
    setEditingComment(null);
    if (provider) updateActiveComment(provider, null);
  };

  const cancelEdit = () => {
    ydoc.transact(() => {
      if (editingComment) {
        const index = yComments.toArray().findIndex(c => {
          const cComment = toComment(c);
          return cComment.id === editingComment.id;
        });
        if (index !== -1) {
          const commentMap = yComments.get(index);
          commentMap.set('isEditing', false);
        }
      }
    });
    setEditingComment(null);
    if (provider) updateActiveComment(provider, null);
  };

  const deleteComment = (id: string, isReply: boolean = false, parentId?: string) => {
    if (!user) return;
    
    // First find the comment to verify ownership
    const comment = findComment(id, comments);
    if (!comment || comment.author.id !== user.id) return;
    
    if (window.confirm('Are you sure you want to delete this comment?')) {
      ydoc.transact(() => {
        if (isReply && parentId) {
          const parentIndex = yComments.toArray().findIndex(c => {
            const cComment = toComment(c);
            return cComment.id === parentId;
          });
          if (parentIndex !== -1) {
            const parent = yComments.get(parentIndex);
            const replies = parent.get('replies') as Y.Array<Y.Map<any>>;
            const replyIndex = replies.toArray().findIndex(r => toComment(r).id === id);
            if (replyIndex !== -1) {
              replies.delete(replyIndex, 1);
            }
          }
        } else {
          const index = yComments.toArray().findIndex(c => {
            const cComment = toComment(c);
            return cComment.id === id;
          });
          if (index !== -1) {
            yComments.delete(index, 1);
          }
        }
      });
    }
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const clearAllNotifications = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md">
            <div className="p-1">
              <textarea
                value={newComment}
                onChange={handleMainCommentChange}
                onKeyPress={handleMainCommentKeyPress}
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
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  newComment.trim()
                    ? 'bg-blue-600 text-white shadow hover:bg-blue-700 hover:shadow-md' 
                    : 'bg-gray-200 text-black cursor-not-allowed'
                }`}
              >
                Post Comment
              </button>
            </div>
          </div>
        )}

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
            users={users}
            replyingTo={replyingTo}
            setReplyingTo={setReplyingTo}
            replyText={replyText}
            onReplyChange={handleReplyChange}
            onReplyKeyPress={handleReplyKeyPress}
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
        .mention {
          color: #3b82f6;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}

export default Comments;