import type { Comment } from './yjsSetup';

/**
 * Finds a comment by its ID in a comment tree
 * @param id The ID of the comment to find
 * @param commentList The list of comments to search through
 * @returns An object containing the found comment, its parent (if nested), and whether it's a reply
 */
export const findComment = (
  id: string, 
  commentList: Comment[]
): {comment: Comment, parent?: Comment, isReply: boolean} | null => {
  for (const comment of commentList) {
    if (comment.id === id) {
      return { comment, isReply: false };
    }
    if (comment.replies && comment.replies.length > 0) {
      const foundInReplies = findComment(id, comment.replies);
      if (foundInReplies) {
        return foundInReplies.comment.id === id 
          ? { comment: foundInReplies.comment, parent: comment, isReply: true }
          : foundInReplies;
      }
    }
  }
  return null;
};

/**
 * Calculates the total number of comments including replies
 * @param comments The list of comments
 * @returns The total count of comments and replies
 */
export const countAllComments = (comments: Comment[]): number => {
  return comments.reduce((total, comment) => {
    return total + 1 + (comment.replies ? countAllComments(comment.replies) : 0);
  }, 0);
};

/**
 * Flattens a tree of comments into a single array
 * @param comments The list of comments to flatten
 * @returns A flat array of all comments and replies
 */
export const flattenComments = (comments: Comment[]): Comment[] => {
  return comments.reduce((acc: Comment[], comment) => {
    return [...acc, comment, ...(comment.replies ? flattenComments(comment.replies) : [])];
  }, []);
};

/**
 * Finds all comments by a specific user
 * @param comments The list of comments to search
 * @param userId The ID of the user to filter by
 * @returns An array of comments made by the specified user
 */
export const findCommentsByUser = (comments: Comment[], userId: string): Comment[] => {
  return flattenComments(comments).filter(comment => comment.author.id === userId);
};

/**
 * Gets the full path to a comment including all parent IDs
 * @param commentId The ID of the comment to find
 * @param comments The list of comments to search
 * @returns An array of comment IDs representing the path (root first)
 */
export const getCommentPath = (commentId: string, comments: Comment[]): string[] => {
  const path: string[] = [];
  
  const findPath = (commentList: Comment[], targetId: string): boolean => {
    for (const comment of commentList) {
      if (comment.id === targetId) {
        path.unshift(comment.id);
        return true;
      }
      if (comment.replies && comment.replies.length > 0) {
        if (findPath(comment.replies, targetId)) {
          path.unshift(comment.id);
          return true;
        }
      }
    }
    return false;
  };
  
  findPath(comments, commentId);
  return path;
};

/**
 * Formats a comment timestamp into a readable string
 * @param timestamp The timestamp to format
 * @returns A human-readable date string
 */
export const formatCommentTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

/**
 * Extracts all unique users mentioned in a comment
 * @param comment The comment to analyze
 * @returns An array of unique user IDs mentioned in the comment
 */
export const getMentionedUsers = (comment: Comment): string[] => {
  if (!comment.mentions || comment.mentions.length === 0) return [];
  return [...new Set(comment.mentions.map(m => m.userId))];
};

/**
 * Checks if a comment is new (within the last 5 minutes)
 * @param comment The comment to check
 * @returns True if the comment is new
 */
export const isNewComment = (comment: Comment): boolean => {
  const commentTime = new Date(comment.timestamp).getTime();
  const now = new Date().getTime();
  return (now - commentTime) < 300000; // 5 minutes in milliseconds
};