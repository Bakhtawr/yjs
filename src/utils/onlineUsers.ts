// utils/onlineUsers.ts
import { Awareness } from 'y-protocols/awareness';

export interface OnlineUser {
  name: string;
  // Removed colorClass since we're using a single color now
}

export const setupOnlineUsers = (awareness: Awareness, user: string) => {
  // Set initial user state (no color needed)
  awareness.setLocalStateField('user', { 
    name: user
  });

  return {
    getOnlineUsers: () => {
      const states = Array.from(awareness.getStates().values())
        .map((state) => state as { user: OnlineUser })
        .map(state => state.user)
        .filter((user): user is OnlineUser => !!user);
      return states;
    },
    updateUserStatus: (online: boolean) => {
      awareness.setLocalStateField('user', { 
        name: user,
        online 
      });
    }
  };
};