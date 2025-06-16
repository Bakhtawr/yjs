import React from 'react';
import type { User } from '../../yjsSetup';

interface PresenceIndicatorProps {
  users: User[];
  currentUser: User;
}

const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({ users, currentUser }) => {
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {users.filter(u => u.id !== currentUser.id).map(user => (
          <div 
            key={user.id}
            className="relative"
            title={user.name}
          >
            <div 
              className="h-8 w-8 rounded-full flex items-center justify-center text-white font-medium border-2 border-white"
              style={{ backgroundColor: user.color }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
        ))}
      </div>
      {users.length > 1 && (
        <span className="ml-2 text-sm text-gray-500">
          {users.length - 1} {users.length === 2 ? 'person' : 'people'} online
        </span>
      )}
    </div>
  );
};

export default PresenceIndicator;