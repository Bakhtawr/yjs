import * as Y from 'yjs';
import { useState, useEffect, useCallback } from 'react';
import { ydoc, yComments, toComment, type User, type Comment, type YNotification } from '../yjsSetup';
import { setupWebsocketProvider } from '../yjsSetup';
import { setupUserPresence, getActiveUsers } from '../utils/yjs/presenceUtils';
import { yNotifications, toNotification } from '../yjsSetup';




export function useCommentsSetup(user: User | null) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [provider, setProvider] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notifications, setNotifications] = useState<YNotification[]>([]);

  const syncNotifications = useCallback(() => {
    const notifs = yNotifications.toArray().map(toNotification);
    setNotifications(notifs);
  }, []);
  
  useEffect(() => {
    const observer = () => syncNotifications();
    yNotifications.observeDeep(observer);
    syncNotifications();
  
    return () => {
      yNotifications.unobserveDeep(observer);
    };
  }, []);

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
    setComments(updatedComments);
  }, [processYComments]);

  useEffect(() => {
    if (!user) return;

    const setup = async () => {
      try {
        setIsProcessing(true);
        const wsProvider = setupWebsocketProvider(ydoc, user, 'comment-room-yjs');
        setProvider(wsProvider);
        setupUserPresence(wsProvider, user);

        wsProvider.on('status', (event: { status: string }) => {
          setIsConnected(event.status === 'connected');
        });

        // 🧠 Always sync comments, even on local transactions
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

  useEffect(() => {
    if (!provider || !user) return;
    
    const handleAwarenessChange = () => {
      setUsers(getActiveUsers(provider));
    };
    
    provider.awareness.on('change', handleAwarenessChange);
    return () => provider.awareness.off('change', handleAwarenessChange);
  }, [provider, user]);

  return {
    comments,
    users,
    isConnected,
    provider,
    isProcessing,
    setComments,
    setIsProcessing,
    notifications,
  };
}
