// src/utils/yjs/notificationUtils.ts

import type { Comment, User } from '../../yjsSetup';

export interface Notification {
  id: string;
  type: 'mention' | 'reply';
  commentId: string;
  author: User;
  recipientId: string; // Jis user ko notification jayegi
  timestamp: string;
  read: boolean;
  content?: string;
}

export const createNotification = (
  type: Notification['type'],
  comment: Comment,
  author: User,
  recipientId: string,
  content?: string
): Notification => {
  return {
    id: Date.now().toString(),
    type,
    commentId: comment.id,
    author,
    recipientId,
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
  
  if (!newComment.mentions || newComment.mentions.length === 0) {
    return newNotifications;
  }

  newComment.mentions.forEach(mention => {
    const mentionedUser = users.find(u => u.name === mention.userName);
    
    // Sirf notify karein agar:
    // 1. Mentioned user exists
    // 2. Mentioned user current user nahi hai
    if (mentionedUser && mentionedUser.id !== currentUser.id) {
      const alreadyNotified = existingNotifications.some(
        n => n.type === 'mention' && 
             n.commentId === newComment.id && 
             n.recipientId === mentionedUser.id
      );
      
      if (!alreadyNotified) {
        newNotifications.push(
          createNotification(
            'mention',
            newComment,
            currentUser,
            mentionedUser.id,
            `@${mention.userName}`
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
  
  // Sirf notify karein agar:
  // 1. Parent comment author current user nahi hai
  if (parentComment.author.id !== currentUser.id) {
    const alreadyNotified = existingNotifications.some(
      n => n.type === 'reply' && 
           n.commentId === parentComment.id && 
           n.recipientId === parentComment.author.id
    );
    
    if (!alreadyNotified) {
      newNotifications.push(
        createNotification(
          'reply',
          parentComment,
          currentUser,
          parentComment.author.id,
          newComment.text.substring(0, 50) // First 50 characters as preview
        )
      );
    }
  }
  
  return newNotifications;
};