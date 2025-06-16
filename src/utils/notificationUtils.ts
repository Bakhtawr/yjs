import type { Comment, User } from '../yjsSetup';

export interface Notification {
  id: string;
  type: 'mention' | 'reply' | 'reaction';
  commentId: string;
  author: User;
  recipientId: string; // This identifies who should receive the notification
  timestamp: string;
  read: boolean;
  content?: string;
}

export const createNotification = (
  type: Notification['type'],
  comment: Comment,
  author: User,
  recipientId: string, // Add recipientId parameter
  content?: string
): Notification => {
  return {
    id: Date.now().toString(),
    type,
    commentId: comment.id,
    author,
    recipientId, // Include in the notification
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
    
    // STRICT CHECK: Only notify if:
    // 1. Mentioned user exists
    // 2. Mentioned user is NOT the current user
    if (mentionedUser && mentionedUser.id !== currentUser.id) {
      const alreadyNotified = existingNotifications.some(
        n => n.type === 'mention' && 
             n.commentId === newComment.id && 
             n.recipientId === mentionedUser.id // Check recipient too
      );
      
      if (!alreadyNotified) {
        newNotifications.push(
          createNotification(
            'mention',
            newComment,
            currentUser,
            mentionedUser.id, // RECIPIENT = mentioned user
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
  
  // Only create notification if parent author is not the current user
  if (parentComment.author.id !== currentUser.id) {
    const alreadyNotified = existingNotifications.some(
      n => n.type === 'reply' && 
           n.commentId === parentComment.id && 
           n.author.id === currentUser.id &&
           n.recipientId === parentComment.author.id
    );
    
    if (!alreadyNotified) {
      newNotifications.push(
        createNotification(
          'reply',
          parentComment,
          currentUser,
          parentComment.author.id, // The recipient is the parent comment author
          newComment.text
        )
      );
    }
  }
  
  return newNotifications;
};