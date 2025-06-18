import * as Y from 'yjs';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ydoc, yComments, toComment, type User, type Comment, type YNotification, yChangeHistory } from '../yjsSetup';
import { setupWebsocketProvider } from '../yjsSetup';
import { yNotifications, toNotification, undoManager } from '../yjsSetup';
import { toast } from 'react-hot-toast';
import { nanoid } from 'nanoid';
import type { WebsocketProvider } from 'y-websocket';

export function useCommentsSetup(user: User | null) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [provider, setProvider] = useState<InstanceType<typeof WebsocketProvider> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notifications, setNotifications] = useState<YNotification[]>([]);
  const [typingUsers, setTypingUsers] = useState<User[]>([]);
  const [changeHistory, setChangeHistory] = useState<ChangeLogEntry[]>([]);
  const prevCommentsRef = useRef<Comment[]>([]);

  // Enhanced notification handling with toast
  useEffect(() => {
    if (!user) return;

    const handleNotifications = () => {
      const allNotifications = yNotifications.toArray().map(toNotification);
      setNotifications(allNotifications);

      // Find unread notifications for current user
      const unreadNotifications = allNotifications
        .filter(n => !n.read && n.recipientId === user.id && n.author.id !== user.id);

      unreadNotifications.forEach(latestUnread => {
        console.log('New notification detected:', latestUnread);
        
        toast.custom(t => (
          <div
            onClick={() => {
              const element = document.getElementById(`comment-${latestUnread.commentId}`);
              element?.scrollIntoView({ behavior: 'smooth' });
              toast.dismiss(t.id);
            }}
            style={{
              background: 'white',
              borderRadius: '8px',
              padding: '10px',
              boxShadow: '0 0 10px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'black'
            }}
          >
            <div
              style={{
                backgroundColor: latestUnread.author.color,
                color: 'black',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
              }}
            >
              {latestUnread.author.name.charAt(0)}
            </div>
            <span>
              <strong>{latestUnread.author.name}</strong>{' '}
              {latestUnread.type === 'reply'
                ? 'replied'
                : latestUnread.type === 'mention'
                ? 'mentioned you'
                : latestUnread.type === 'edit'
                ? 'edited a comment'
                : 'deleted a comment'}
              : {latestUnread.content?.slice(0, 50)}
            </span>
          </div>
        ), { duration: Infinity }); 
        
        

        // Mark as read in Yjs
        ydoc.transact(() => {
          const notificationMap = yNotifications
            .toArray()
            .find(n => n.get('id') === latestUnread.id);
          
          if (notificationMap) {
            notificationMap.set('read', true);
          }
        });
      });
    };

    yNotifications.observeDeep(handleNotifications);
    handleNotifications(); // Initial check

    return () => {
      yNotifications.unobserveDeep(handleNotifications);
    };
  }, [user?.id]);

  // Track comment changes and detect edits for history
  const processYComments = useCallback(() => {
    const processNested = (yComment: Y.Map<any>): Comment => {
      const comment = toComment(yComment);
      const replies = yComment.get('replies') as Y.Array<Y.Map<any>>;
      return {
        ...comment,
        replies: replies ? replies.toArray().map(processNested) : []
      };
    };
    return yComments.toArray().map(processNested);
  }, []);

  const updateCommentsFromYjs = useCallback(() => {
    const updatedComments = processYComments();
    
    // Detect changes for history
    updatedComments.forEach((comment, index) => {
      const prevComment = prevCommentsRef.current[index];
      if (prevComment && prevComment.text !== comment.text) {
        logChange('edit', comment.id, user?.id || 'system', `Comment edited`);
      }
    });

    prevCommentsRef.current = updatedComments;
    setComments(updatedComments);
  }, [processYComments, user?.id]);

  // Track typing users
  useEffect(() => {
    if (!provider) return;

    const handleTypingChange = () => {
      const states = Array.from(provider.awareness.getStates().values());
      const typing = states
        .filter(state => (state as any)?.user?.typing)
        .map(state => (state as any).user)
        .filter(Boolean);
      setTypingUsers(typing);
    };

    provider.awareness.on('change', handleTypingChange);
    return () => provider.awareness.off('change', handleTypingChange);
  }, [provider]);

  // Track online users
  useEffect(() => {
    if (!provider) return;
    
    const handleAwarenessChange = () => {
      const states = Array.from(provider.awareness.getStates().values());
      const activeUsers = states
        .map(state => (state as any).user)
        .filter(user => user && user.id);
      setUsers(activeUsers);
    };
    
    provider.awareness.on('change', handleAwarenessChange);
    return () => provider.awareness.off('change', handleAwarenessChange);
  }, [provider]);

  // Track change history
  useEffect(() => {
    const handleHistoryChange = () => {
      const changes = yChangeHistory.toArray().map(yEntry => ({
        id: yEntry.get('id'),
        userId: yEntry.get('userId'),
        timestamp: yEntry.get('timestamp'),
        action: yEntry.get('action'),
        commentId: yEntry.get('commentId'),
        details: yEntry.get('details') || ''
      }));
      setChangeHistory(changes);
    };

    yChangeHistory.observe(handleHistoryChange);
    handleHistoryChange(); // Initial load

    return () => yChangeHistory.unobserve(handleHistoryChange);
  }, []);

  // Initialize connection
  useEffect(() => {
    if (!user) return;

    const setup = async () => {
      try {
        setIsProcessing(true);
        const wsProvider = setupWebsocketProvider(ydoc, user, 'comment-room-yjs');
        setProvider(wsProvider);

        // Set up presence
        wsProvider.awareness.setLocalStateField('user', {
          ...user,
          active: true,
          lastActive: new Date().toISOString(),
          typing: false
        });

        wsProvider.on('status', (event: { status: string }) => {
          setIsConnected(event.status === 'connected');
        });

        // Observe comments for changes
        const observer = () => {
          updateCommentsFromYjs();
        };

        yComments.observeDeep(observer);
        updateCommentsFromYjs();

        return () => {
          yComments.unobserveDeep(observer);
          wsProvider?.destroy();
        };
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsProcessing(false);
      }
    };

    setup();
  }, [user, updateCommentsFromYjs]);

  // Helper function to log changes
  const logChange = (action: 'add' | 'edit' | 'delete', commentId: string, userId: string, details?: string) => {
    const yEntry = new Y.Map();
    yEntry.set('id', nanoid());
    yEntry.set('userId', userId);
    yEntry.set('timestamp', new Date().toISOString());
    yEntry.set('action', action);
    yEntry.set('commentId', commentId);
    yEntry.set('details', details || '');
    yChangeHistory.push([yEntry]);
  };

  // Typing indicator control
  const setTyping = (isTyping: boolean) => {
    if (!provider || !user) return;
    
    provider.awareness.setLocalStateField('user', {
      ...provider.awareness.getLocalState().user,
      typing: isTyping
    });
  };

  // Undo/Redo functionality
  const undo = () => {
    undoManager.undo();
  };

  const redo = () => {
    undoManager.redo();
  };

  return {
    comments,
    users,
    typingUsers,
    isConnected,
    provider,
    isProcessing,
    notifications,
    changeHistory,
    setComments,
    setIsProcessing,
    setTyping,
    undo,
    redo,
    logChange
  };
}

// Additional type for change history
interface ChangeLogEntry {
  id: string;
  userId: string;
  timestamp: string;
  action: 'add' | 'edit' | 'delete';
  commentId: string;
  details?: string;
}