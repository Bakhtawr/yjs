import { useCallback, useState } from 'react';
import { ydoc, yComments, toComment, createYComment, type User, type Comment, yNotifications, type Mention } from '../yjsSetup';
import { updateActiveComment } from '../utils/yjs/presenceUtils';
import { Y } from '../yjsSetup';
import { findComment } from '../utils/comments/commentUtils';
import { nanoid } from 'nanoid';

interface CommentActions {
  addComment: (text: string, replyingTo: string | null, mentions?: Mention[], parentPath?: string[]) => Promise<void>;
  startEditing: (comment: Comment) => void;
  saveEdit: () => Promise<void>;
  cancelEdit: () => void;
  deleteComment: (id: string, isReply?: boolean, parentId?: string) => void;
  editingComment: { id: string; text: string } | null;
  setEditingComment: React.Dispatch<React.SetStateAction<{ id: string; text: string } | null>>;
}

export function useCommentActions(
  user: User | null, 
  provider: any, 
  comments: Comment[], 
  _users: User[], 
  _notifications: Notification[], 
  _setNotifications: (notifications: Notification[]) => void, 
  setError: (error: string | null) => void, 
  setIsProcessing: (processing: boolean) => void
): CommentActions {
  const users = _users;
  const [editingComment, setEditingComment] = useState<{ id: string; text: string } | null>(null);

  const createNotification = useCallback((notification: {
    type: 'mention' | 'reply' | 'edit' | 'delete';
    commentId: string;
    author: User;
    recipientId: string;
    content?: string;
    read?: boolean;
  }) => {
    const yNotif = new Y.Map();
    yNotif.set('id', nanoid());
    yNotif.set('type', notification.type);
    yNotif.set('commentId', notification.commentId);
    yNotif.set('author', notification.author);
    yNotif.set('recipientId', notification.recipientId);
    yNotif.set('timestamp', new Date().toISOString());
    yNotif.set('read', false);
    yNotif.set('content', notification.content || '');
    yNotifications.push([yNotif]);
  }, []);

  const addComment = useCallback(
    async (text: string, replyingTo: string | null, mentions: Mention[] = [], parentPath: string[] = []) => {
      if (!user || !text.trim()) return;
  
      try {
        setIsProcessing(true);
        
        // Process mentions to ensure they have firstName
        const processedMentions = mentions.map(mention => {
          const mentionedUser = users.find(u => u.id === mention.userId);
          return {
            ...mention,
            firstName: mentionedUser?.name.split(' ')[0] || mention.userName.split(' ')[0]
          };
        });
        
        const yComment = createYComment(text, user, processedMentions);
  
        await ydoc.transact(async () => {
          if (replyingTo) {
            let currentArray = yComments;
            
            // Navigate through parent path if provided
            if (parentPath.length > 0) {
              for (const parentId of parentPath) {
                const parentIndex = currentArray.toArray().findIndex(c => toComment(c).id === parentId);
                if (parentIndex === -1) break;
                
                const parent = currentArray.get(parentIndex);
                const replies = parent.get('replies') as Y.Array<Y.Map<any>>;
                currentArray = replies;
              }
            }
  
            const parentIndex = currentArray.toArray().findIndex(c => toComment(c).id === replyingTo);
            if (parentIndex !== -1) {
              const parent = currentArray.get(parentIndex);
              const replies = parent.get('replies') as Y.Array<Y.Map<any>>;
              replies.push([yComment]);
  
              // Create reply notification if not replying to self
              const parentComment = toComment(parent);
              if (parentComment.author.id !== user.id) {
                // Check if parent comment author is mentioned
                const isParentMentioned = processedMentions.some(m => m.userId === parentComment.author.id);
                
                if (!isParentMentioned) {
                  createNotification({
                    type: 'reply',
                    commentId: replyingTo,
                    author: user,
                    recipientId: parentComment.author.id,
                    content: `Replied to your comment: ${text.substring(0, 50)}...`
                  });
                }
              }
            }
          } else {
            yComments.push([yComment]);
          }
  
          // Create mention notifications (prioritized over replies)
          processedMentions.forEach(mention => {
            const mentionedUser = users.find(u => u.id === mention.userId);
            if (!mentionedUser || mentionedUser.id === user.id) return;
  
            createNotification({
              type: 'mention',
              commentId: yComment.get('id'),
              author: user,
              recipientId: mention.userId,
              content: `You were mentioned by ${user.name}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`
            });
          });
        });
  
        if (provider) updateActiveComment(provider, null);
      } catch (err) {
        setError('Failed to add comment');
        console.error('Add comment error:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    [user, provider, users, createNotification, setIsProcessing, setError]
  );

  const startEditing = useCallback(
    (comment: Comment) => {
      if (!user || comment.author.id !== user.id) return;
      setEditingComment({ id: comment.id, text: comment.text });
      if (provider) updateActiveComment(provider, comment.id);

      ydoc.transact(() => {
        const markEditing = (arr: Y.Array<Y.Map<any>>): boolean => {
          for (let i = 0; i < arr.length; i++) {
            const item = arr.get(i);
            if (toComment(item).id === comment.id) {
              item.set('isEditing', true);
              return true;
            }
            const replies = item.get('replies') as Y.Array<Y.Map<any>>;
            if (replies && markEditing(replies)) return true;
          }
          return false;
        };
        markEditing(yComments);
      });
    },
    [provider, user]
  );

  const saveEdit = useCallback(
    async () => {
      if (!editingComment || !user) return;
      try {
        setIsProcessing(true);
        await ydoc.transact(() => {
          const applyEdit = (arr: Y.Array<Y.Map<any>>): boolean => {
            for (let i = 0; i < arr.length; i++) {
              const item = arr.get(i);
              if (toComment(item).id === editingComment.id) {
                const oldText = item.get('text');
                item.set('text', editingComment.text);
                item.set('isEditing', false);
                item.set('updatedAt', new Date().toISOString());

                if (oldText !== editingComment.text) {
                  createNotification({
                    type: 'edit',
                    commentId: editingComment.id,
                    author: user,
                    recipientId: user.id,
                    content: `Edited comment: ${editingComment.text.substring(0, 100)}`
                  });
                }
                return true;
              }
              const replies = item.get('replies') as Y.Array<Y.Map<any>>;
              if (replies && applyEdit(replies)) return true;
            }
            return false;
          };
          if (!applyEdit(yComments)) throw new Error('Comment not found');
        });

        setEditingComment(null);
        if (provider) updateActiveComment(provider, null);
      } catch (err) {
        setError('Failed to save changes');
        console.error('Edit error:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    [editingComment, provider, user, createNotification, setIsProcessing, setError]
  );

  const cancelEdit = useCallback(
    () => {
      ydoc.transact(() => {
        const removeEditFlag = (arr: Y.Array<Y.Map<any>>): boolean => {
          for (let i = 0; i < arr.length; i++) {
            const item = arr.get(i);
            if (toComment(item).id === editingComment?.id) {
              item.set('isEditing', false);
              return true;
            }
            const replies = item.get('replies') as Y.Array<Y.Map<any>>;
            if (replies && removeEditFlag(replies)) return true;
          }
          return false;
        };
        removeEditFlag(yComments);
      });
      setEditingComment(null);
      if (provider) updateActiveComment(provider, null);
    },
    [editingComment, provider]
  );

  const deleteComment = useCallback(
    (id: string, isReply: boolean = false, parentId?: string) => {
      if (!user) return;

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
                createNotification({
                  type: 'delete',
                  commentId: id,
                  author: user,
                  recipientId: user.id,
                  content: 'Deleted a reply'
                });
              }
            }
          } else {
            const index = yComments.toArray().findIndex(c => toComment(c).id === id);
            if (index !== -1) {
              yComments.delete(index, 1);
              createNotification({
                type: 'delete',
                commentId: id,
                author: user,
                recipientId: user.id,
                content: 'Deleted a comment'
              });
            }
          }
        });
      }
    },
    [user, comments, createNotification]
  );

  return {
    addComment,
    startEditing,
    saveEdit,
    cancelEdit,
    deleteComment,
    editingComment,
    setEditingComment
  };
}