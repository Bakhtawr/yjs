import type { Comment, User } from './yjsSetup';

export interface Notification {
  id: string;
  type: 'mention' | 'reply' | 'reaction';
  commentId: string;
  author: User;
  timestamp: string;
  read: boolean;
  content?: string;
}

export const createNotification = (
  type: Notification['type'],
  comment: Comment,
  author: User,
  content?: string
): Notification => {
  return {
    id: Date.now().toString(),
    type,
    commentId: comment.id,
    author,
    timestamp: new Date().toISOString(),
    read: false,
    content
  };
};

export const checkForMentions = (
  newComment: Comment,
  currentUser: User,
  users: User[],
  existingNotifications: Notification[]
): Notification[] => {
  const newNotifications: Notification[] = [];
  
  if (!newComment.mentions) return newNotifications;
  
  newComment.mentions.forEach(mention => {
    const mentionedUser = users.find(u => u.id === mention.userId);
    if (mentionedUser && mentionedUser.id !== currentUser.id) {
      // Check if notification already exists
      const alreadyNotified = existingNotifications.some(
        n => n.type === 'mention' && 
             n.commentId === newComment.id && 
             n.author.id === newComment.author.id
      );
      
      if (!alreadyNotified) {
        newNotifications.push(
          createNotification(
            'mention',
            newComment,
            newComment.author,
            newComment.text.substring(mention.position, mention.position + mention.length)
          )
        );
      }
    }
  });
  
  return newNotifications;
};

export const checkForReplies = (
  newComment: Comment,
  parentComment: Comment,
  currentUser: User,
  existingNotifications: Notification[]
): Notification[] => {
  const newNotifications: Notification[] = [];
  
  // Notify parent comment author if it's not the same user
  if (parentComment.author.id !== currentUser.id) {
    const alreadyNotified = existingNotifications.some(
      n => n.type === 'reply' && 
           n.commentId === parentComment.id && 
           n.author.id === currentUser.id
    );
    
    if (!alreadyNotified) {
      newNotifications.push(
        createNotification(
          'reply',
          parentComment,
          currentUser,
          newComment.text
        )
      );
    }
  }
  
  return newNotifications;
};