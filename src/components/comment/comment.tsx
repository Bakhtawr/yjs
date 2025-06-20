import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { generateColorFromUID } from '../../utils/auth/authUtils';
import { useCommentsSetup } from '../../hooks/useCommentsSetup';
import { useCommentActions } from '../../hooks/useCommentActions';
import CommentList from './commentlist';
import PresenceIndicator from './PresenceIndicator';
import type { User, Mention } from '../../yjsSetup';
import { updateCursorPosition } from '../../utils/yjs/presenceUtils';
import CommentInput from './commentInput';

export interface Comment {
  id: string;
  text: string;
  author: User;
  timestamp: string;
  replies?: Comment[];
  isEditing?: boolean;
  updatedAt?: string;
  mentions?: Mention[];
}

function Comments() {
  const { currentUser, loginWithGoogle } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mentions, setMentions] = useState<Mention[]>([]);

  const {
    comments,
    users,
    isConnected,
    provider,
    isProcessing,
    setIsProcessing,
    typingUsers,
    setTyping,
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
    [], 
    () => {}, 
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
        avatar: currentUser.photoURL || undefined,
        find: function (): unknown {
          throw new Error('Function not implemented.');
        }
      };
      setUser(userData);
    }
  }, [currentUser]);

  const extractMentions = useCallback((text: string): Mention[] => {
    const mentionRegex = /@(\w+)/g;
    const found: Mention[] = [];
    let match: RegExpExecArray | null;
  
    while ((match = mentionRegex.exec(text)) !== null) {
      const typed = match[1].toLowerCase(); // e.g. "firstname"
  
      const matchUser = users.find(
        u => u.name.toLowerCase().startsWith(typed) && u.id !== currentUser?.uid
      );
  
      if (matchUser) {
        found.push({
          userId: matchUser.id,
          userName: matchUser.name,
          position: match.index,
          length: match[0].length
        });
      }
    }
  
    return found;
  }, [users, currentUser?.uid]);
  

  const handleReplyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setReplyText(text);
    setMentions(extractMentions(text));
    if (provider) updateCursorPosition(provider, { x: e.target.selectionStart, y: 0 });
    setTyping(text.length > 0);
  };

  const handleMainCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNewComment(text);
    setMentions(extractMentions(text));
    if (provider) updateCursorPosition(provider, { x: e.target.selectionStart, y: 0 });
    setTyping(text.length > 0);
  };

  const handleMainCommentKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!replyingTo) {
        addComment(newComment, null, mentions);
        setNewComment('');
        setMentions([]);
        setTyping(false);
      }
    }
  };

  const handleReplyKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addComment(replyText, replyingTo, mentions);
      setReplyText('');
      setReplyingTo(null);
      setMentions([]);
      setTyping(false);
    }
  };
  
  const handleAddComment = useCallback(() => {
    if (replyingTo) {
      addComment(replyText, replyingTo, mentions);
      setReplyText('');
      setReplyingTo(null);
      setMentions([]);
    } else {
      addComment(newComment, null, mentions);
      setNewComment('');
      setMentions([]);
    }
    setTyping(false);
  }, [addComment, newComment, replyText, replyingTo, mentions]);

  const onMentionInsert = useCallback((text: string) => {
    setMentions(extractMentions(text));
  }, [extractMentions]);

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
            <PresenceIndicator 
              users={users} 
              currentUser={user} 
              typingUsers={typingUsers} 
            />       
          </div>
        </div>

        {!replyingTo && (
          <CommentInput
            value={newComment}
            onChange={handleMainCommentChange}
            onKeyPress={handleMainCommentKeyPress}
            onSubmit={() => {
              addComment(newComment, null, mentions);
              setNewComment('');
              setMentions([]);
            }}
            isProcessing={isProcessing}
            onValueChange={(text) => {
              setNewComment(text);
              setMentions(extractMentions(text)); 
            }}
            onMentionInsert={onMentionInsert} 
            users={users.filter(u => u.id !== user?.id)}
            currentUserId={user?.id}
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
              setReplyText={setReplyText}
              onReplyChange={handleReplyChange}
              onReplyKeyPress={handleReplyKeyPress}
              editingComment={editingComment}
              setEditingComment={setEditingComment}
              onAddComment={handleAddComment}
              onDeleteComment={deleteComment}
              onStartEditing={startEditing}
              onSaveEdit={saveEdit}
              onCancelEdit={cancelEdit}            
              onMentionInsert={onMentionInsert}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Comments;