import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export interface User {
  id: string;
  name: string;
  color: string;
  avatar?: string;
}

export interface Mention {
  userName: any;
  userId: string;
  position: number;
  length: number;
}

export interface Comment {
  text: string;
  author: User;
  timestamp: string;
  id: string;
  replies: Comment[];
  isEditing?: boolean;
  mentions?: Mention[];
}

export interface YNotification {

  id: string
  type: 'mention' | 'reply';
  commentId: string;
  author: User;
  recipientId: string;
  timestamp: string;
  read: boolean;
  content?: string;
}

export const ydoc = new Y.Doc();
export const yNotifications = ydoc.getArray<Y.Map<any>>('notifications');
export const yComments = ydoc.getArray<Y.Map<any>>('comments');
export const yUsers = ydoc.getMap<User>('users');

export const setupWebsocketProvider = (ydoc: Y.Doc, _user: User, roomName: string) => {
  const provider = new WebsocketProvider(
    'wss://yjs-server.onrender.com', 
    roomName,
    ydoc
  );
  
  // Initialize awareness properly
  if (!provider.awareness) {
    provider.awareness = {
      states: new Map(),
      setLocalState: () => {},
      getLocalState: () => ({}),
      on: () => {},
      off: () => {},
      emit: () => {}
    };
  }
  
  return provider;
};

export const toComment = (item: Y.Map<any> | any): Comment => {
  if (item instanceof Y.Map) {
    return {
      text: item.get('text'),
      author: item.get('author'),
      timestamp: item.get('timestamp'),
      id: item.get('id'),
      replies: (item.get('replies') as Y.Array<Y.Map<any>>)?.toArray().map(toComment) || [],
      isEditing: item.get('isEditing') || false,
      mentions: item.get('mentions') || [],
    };
  }
  return {
    text: item.text,
    author: item.author,
    timestamp: item.timestamp,
    id: item.id,
    replies: item.replies?.map(toComment) || [],
    isEditing: item.isEditing || false,
    mentions: item.mentions || [],
  };
};

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
  yComment.set('replies', new Y.Array());
  yComment.set('isEditing', isEditing);
  yComment.set('mentions', mentions);
  return yComment;
};

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


export const createYCommentFromJSON = (comment: Comment): Y.Map<any> => {
  const yComment = new Y.Map();
  yComment.set('text', comment.text);
  yComment.set('author', comment.author);
  yComment.set('timestamp', comment.timestamp);
  yComment.set('id', comment.id);
  yComment.set('isEditing', comment.isEditing || false);
  yComment.set('mentions', comment.mentions || []);

  const repliesArray = new Y.Array<Y.Map<any>>();
  comment.replies?.forEach(reply => {
    repliesArray.push([createYCommentFromJSON(reply)]);
  });

  yComment.set('replies', repliesArray);
  return yComment;
};
export { Y };

