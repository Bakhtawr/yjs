import React from 'react';
import type { User } from '../../yjsSetup';

interface PresenceIndicatorProps {
  users: User[];
  currentUser: User;
  typingUsers?: User[]; // Optional typing users array
}

const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({ 
  users, 
  currentUser,
  typingUsers = [] 
}) => {
  // Create a unique list of users to prevent duplicates
  const uniqueUsers = React.useMemo(() => {
    const seen = new Set<string>();
    return users.filter(user => {
      // Skip current user and duplicates
      if (user.id === currentUser.id || seen.has(user.id)) {
        return false;
      }
      seen.add(user.id);
      return true;
    });
  }, [users, currentUser.id]);

  // Filter out current user from typing users
  const otherTypingUsers = React.useMemo(() => 
    typingUsers.filter(user => user.id !== currentUser.id),
    [typingUsers, currentUser.id]
  );

  // Check if a user is currently typing (excluding current user)
  const isTyping = (userId: string) => 
    otherTypingUsers.some(u => u.id === userId);

  return (
    <div className="flex items-center space-x-2">
      <div className="flex -space-x-2">
        {uniqueUsers.map(user => (
          <div 
            key={`${user.id}-${user.name}`}
            className="relative group"
            aria-label={`${user.name}${isTyping(user.id) ? ' (typing...)' : ''}`}
          >
            {/* User avatar */}
            <div 
              className={`h-8 w-8 rounded-full flex items-center justify-center text-white font-medium border-2 border-white transition-all ${
                isTyping(user.id) ? 'ring-2 ring-blue-500 animate-pulse' : ''
              }`}
              style={{ backgroundColor: user.color }}
            >
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            
            {/* Online status indicator */}
            <div 
              className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                isTyping(user.id) ? 'bg-blue-500' : 'bg-green-500'
              }`}
              aria-hidden="true"
            />
            
            {/* Enhanced tooltip with typing status */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap">
              {user.name}
              {isTyping(user.id) && (
                <span className="ml-1 text-blue-300">(typing...)</span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Online count with typing indicators */}
      {uniqueUsers.length > 0 && (
        <div className="flex flex-col">
          <span className="text-sm text-gray-500">
            {uniqueUsers.length} {uniqueUsers.length === 1 ? 'person' : 'people'} online
          </span>
          {otherTypingUsers.length > 0 && (
            <span className="text-xs text-blue-500">
              {otherTypingUsers.length === 1 
                ? `${otherTypingUsers[0].name} is typing...`
                : `${otherTypingUsers.length} people typing...`}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(PresenceIndicator);