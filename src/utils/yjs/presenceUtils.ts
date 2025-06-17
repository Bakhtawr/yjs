import type { User } from '../../yjsSetup';

// Define types for presence/awareness states
interface PresenceState {
  user: User;
  cursor: { x: number; y: number } | null;
  activeComment: string | null;
  lastActive: number;
}

export const setupUserPresence = (provider: { awareness: any }, user: User) => {
  // Set initial user state
  provider.awareness.setLocalState({
    user,
    cursor: null,
    activeComment: null,
    lastActive: Date.now()
  });

  // Update last active timestamp periodically
  const interval = setInterval(() => {
    provider.awareness.setLocalState({
      ...provider.awareness.getLocalState(),
      lastActive: Date.now()
    });
  }, 30000);

  return () => clearInterval(interval);
};

export const getActiveUsers = (provider: { awareness: any }): User[] => {
  const states = Array.from(provider.awareness.getStates().values()) as PresenceState[];
  return states
    .filter(state => state?.user && Date.now() - state.lastActive < 120000)
    .map(state => state.user);
};

export const updateCursorPosition = (provider: { awareness: any }, position: { x: number; y: number } | null) => {
  const currentState = provider.awareness.getLocalState() as PresenceState;
  provider.awareness.setLocalState({
    ...currentState,
    cursor: position
  });
};

export const updateActiveComment = (provider: { awareness: any }, commentId: string | null) => {
  const currentState = provider.awareness.getLocalState() as PresenceState;
  provider.awareness.setLocalState({
    ...currentState,
    activeComment: commentId
  });
};