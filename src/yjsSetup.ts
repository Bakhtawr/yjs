import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export interface User {
  id: string;
  name: string;
  color: string;
  avatar?: string;
}

export interface Mention {
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

export const ydoc = new Y.Doc();
export const yComments = ydoc.getArray<Y.Map<any>>('comments');
export const yUsers = ydoc.getMap<User>('users');

export const setupWebsocketProvider = (roomName: string) => {
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