import React from 'react';
import type { User } from '../../yjsSetup';

interface PresenceIndicatorProps {
  users: User[];
  currentUser: User;
}

const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({ users, currentUser }) => {
  // Create a unique list of users to prevent duplicates
  const uniqueUsers = React.useMemo(() => {
    const seen = new Set();
    return users.filter(user => {
      // Skip current user and duplicates
      if (user.id === currentUser.id || seen.has(user.id)) {
        return false;
      }
      seen.add(user.id);
      return true;
    });
  }, [users, currentUser.id]);

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {uniqueUsers.map(user => (
          <div 
            key={`${user.id}-${user.name}`} // More unique key
            className="relative group" // Added group for tooltip
            aria-label={user.name}
          >
            <div 
              className="h-8 w-8 rounded-full flex items-center justify-center text-white font-medium border-2 border-white transition-transform group-hover:scale-110"
              style={{ backgroundColor: user.color }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div 
              className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"
              aria-hidden="true"
            />
            {/* Enhanced tooltip */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap">
              {user.name}
            </div>
          </div>
        ))}
      </div>
      {uniqueUsers.length > 0 && (
        <span className="ml-2 text-sm text-gray-500">
          {uniqueUsers.length} {uniqueUsers.length === 1 ? 'person' : 'people'} online
        </span>
      )}
    </div>
  );
};

export default PresenceIndicator;