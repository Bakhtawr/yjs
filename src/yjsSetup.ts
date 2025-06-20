import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// ----------------------
// Types and Interfaces
// ----------------------

// User object for presence and authorship
export interface User {
  find(arg0: (u: any) => boolean): unknown;
  id: string;
  name: string;
  color: string;
  avatar?: string;
}

// Mentioning system in comments
export interface Mention {
  userName: string;
  userId: string;
  position: number;
  length: number;
}

// Recursive comment structure with optional mentions and editing states
export interface Comment {
  updatedAt: any;
  text: string;
  author: User;
  timestamp: string;
  id: string;
  replies: Comment[];
  isEditing?: boolean;
  mentions?: Mention[];
}

// Notification schema for @mentions, replies, edits, deletes
export interface YNotification {
  id: string;
  type: 'mention' | 'reply' | 'edit' | 'delete';
  commentId: string;
  author: User;
  recipientId: string;
  timestamp: string;
  read: boolean;
  content?: string;
}

// Logs to track who made what change and when
export interface ChangeLogEntry {
  id: string;
  userId: string;
  timestamp: string;
  action: 'add' | 'edit' | 'delete';
  commentId: string;
  details?: string;
}

// ----------------------
// Yjs Shared Documents
// ----------------------

export const ydoc = new Y.Doc(); // Root collaborative document
export const yComments = ydoc.getArray<Y.Map<any>>('comments'); // Main comment thread
export const yNotifications = ydoc.getArray<Y.Map<any>>('notifications'); // Alerts and mentions
export const yChangeHistory = ydoc.getArray<Y.Map<any>>('changeHistory'); // Edits/deletes log
export const yUsers = ydoc.getMap<User>('users'); // Online user state map

// Enable undo/redo across local changes
export const undoManager = new Y.UndoManager(yComments, {
  trackedOrigins: new Set(['local']),
  captureTimeout: 500, // milliseconds
});

// ----------------------
// Setup WebSocket Sync & Awareness
// ----------------------

let provider: InstanceType<typeof WebsocketProvider>;

export const setupWebsocketProvider = (ydoc: Y.Doc, user: User, roomName: string) => {
  provider = new WebsocketProvider('wss://yjs-server.onrender.com', roomName, ydoc);

  // Awareness state helps broadcast user info & typing
  provider.awareness.setLocalStateField('user', {
    id: user.id,
    name: user.name,
    color: user.color,
    typing: false, // Additional typing flag
  });

  return provider;
};

// Toggle typing indicator (used in input fields)
export const updateTypingStatus = (typing: boolean) => {
  const current = provider.awareness.getLocalState();
  provider.awareness.setLocalStateField('user', {
    ...current?.user,
    typing,
  });
};

// List of connected/visible users in the session
export const getOnlineUsers = (): User[] => {
  const states = Array.from(provider.awareness.getStates().values());
  return states.map((state: any) => state.user).filter((u: User) => !!u);
};

// Subset of users currently typing
export const getTypingUsers = (): User[] => {
  const states = Array.from(provider.awareness.getStates().values());
  return states.map((state: any) => state.user).filter((u: any) => u?.typing);
};

// ----------------------
// Comment Transformation & Creation
// ----------------------

// Convert shared Y.Map to frontend Comment object
export const toComment = (item: Y.Map<any>): Comment => ({
  text: item.get('text'),
  author: item.get('author'),
  timestamp: item.get('timestamp'),
  id: item.get('id'),
  replies: (item.get('replies') as Y.Array<Y.Map<any>>)?.toArray().map(toComment) || [],
  isEditing: item.get('isEditing') || false,
  mentions: item.get('mentions') || [],
  updatedAt: undefined
});

// New Y.Map comment from scratch (used in input form)
export const createYComment = (
  text: string,
  author: User,
  mentions: Mention[] = [],
  isEditing = false
): Y.Map<any> => {
  const yComment = new Y.Map();
  yComment.set('text', text);
  yComment.set('author', author);
  yComment.set('timestamp', new Date().toISOString());
  yComment.set('id', Date.now().toString());
  yComment.set('replies', new Y.Array()); // Init empty reply thread
  yComment.set('isEditing', isEditing);
  yComment.set('mentions', mentions);
  return yComment;
};

// Convert Comment (JS object) into collaborative Y.Map
export const createYCommentFromJSON = (comment: Comment): Y.Map<any> => {
  const yComment = createYComment(comment.text, comment.author, comment.mentions || [], comment.isEditing);
  yComment.set('timestamp', comment.timestamp);
  yComment.set('id', comment.id);

  const repliesArray = new Y.Array<Y.Map<any>>();
  comment.replies?.forEach(reply => {
    repliesArray.push([createYCommentFromJSON(reply)]);
  });

  yComment.set('replies', repliesArray);
  return yComment;
};

// ----------------------
// Notification Utils
// ----------------------

// Convert Y.Map notification into JS-friendly structure
export const toNotification = (item: Y.Map<any>): YNotification => ({
  id: item.get('id'),
  type: item.get('type'),
  commentId: item.get('commentId'),
  author: item.get('author'),
  recipientId: item.get('recipientId'),
  timestamp: item.get('timestamp'),
  read: item.get('read'),
  content: item.get('content') || '',
});

// Create Y.Map for notification (mention/reply/edit/delete)
export const createYNotification = (notif: YNotification): Y.Map<any> => {
  const yNotif = new Y.Map();
  yNotif.set('id', notif.id);
  yNotif.set('type', notif.type);
  yNotif.set('commentId', notif.commentId);
  yNotif.set('author', notif.author);
  yNotif.set('recipientId', notif.recipientId);
  yNotif.set('timestamp', notif.timestamp);
  yNotif.set('read', notif.read);
  yNotif.set('content', notif.content || '');
  return yNotif;
};

// ----------------------
// Change History Logs
// ----------------------

// Log a new change entry (edit/delete/add)
export const createYChangeLog = (entry: ChangeLogEntry): Y.Map<any> => {
  const yEntry = new Y.Map();
  yEntry.set('id', entry.id);
  yEntry.set('userId', entry.userId);
  yEntry.set('timestamp', entry.timestamp);
  yEntry.set('action', entry.action);
  yEntry.set('commentId', entry.commentId);
  yEntry.set('details', entry.details || '');
  return yEntry;
};

// Export Yjs root object if needed externally
export { Y };
