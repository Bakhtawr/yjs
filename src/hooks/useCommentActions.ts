import { useCallback, useState } from 'react';
import { ydoc, yComments, toComment, createYComment, type User, type Comment } from '../yjsSetup';
import { updateActiveComment } from '../utils/yjs/presenceUtils';
import { Y } from '../yjsSetup';
import { findComment } from '../utils/comments/commentUtils';
import type { Notification } from '../components/comment/comment';

export function useCommentActions(
user: User | null, provider: any, comments: Comment[], users: User[], _notifications: Notification[], _setNotifications: unknown, setError: (error: string | null) => void, setIsProcessing: (processing: boolean) => void) {
  const [editingComment, setEditingComment] = useState<{ id: string; text: string } | null>(null);

  const addComment = useCallback(
    async (text: string, replyingTo: string | null) => {
      if (!user || !text.trim()) return;

      try {
        setIsProcessing(true);
        const yComment = createYComment(text, user);

        await ydoc.transact(async () => {
          if (replyingTo) {
            const parentIndex = yComments.toArray().findIndex(c => toComment(c).id === replyingTo);
            if (parentIndex !== -1) {
              const parent = yComments.get(parentIndex);
              const replies = parent.get('replies') as Y.Array<Y.Map<any>>;
              replies.push([yComment]);

              const parentComment = toComment(parent);

              if (parentComment.author.id !== user.id) {
               
                console.log('🔔 Creating reply notification for', parentComment.author.name);

               
              }

              parent.set('updatedAt', new Date().toISOString());
            }
          } else {
            yComments.push([yComment]);

   
           
          }
        });

        if (provider) updateActiveComment(provider, null);
      } catch (err) {
        setError('Failed to add comment');
        console.error('Add comment error:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    [user, provider, users, setIsProcessing, setError]
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
                item.set('text', editingComment.text);
                item.set('isEditing', false);
                item.set('updatedAt', new Date().toISOString());
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
    [editingComment, provider, user]
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

  const deleteComment = (id: string, isReply: boolean = false, parentId?: string) => {
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

            if (replyIndex !== -1) replies.delete(replyIndex, 1);
          }
        } else {
          const index = yComments.toArray().findIndex(c => toComment(c).id === id);
          if (index !== -1) yComments.delete(index, 1);
        }
      });
    }
  };

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
