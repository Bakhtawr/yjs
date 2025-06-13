// components/OnlineUsers.tsx
import React from 'react';
import type { OnlineUser } from '../../utils/onlineUsers';

interface OnlineUsersProps {
  users: OnlineUser[];
  currentUser: string;
}

const OnlineUsers: React.FC<OnlineUsersProps> = ({ users, currentUser }) => {
  return (
    <div className="online-users">
      <h3 className="text-sm font-medium text-gray-700 mb-1">Online ({users.length})</h3>
      <div className="user-list space-y-1 text-black">
        {users.map(user => (
          <div 
            key={user.name} 
            className="flex items-center text-xs"
          >
            <span 
              className="inline-block w-2 h-2 rounded-full mr-2 bg-green-500"
              style={{ backgroundColor: 'var(--color-green-500)' }}
            ></span>
            <span className={user.name === currentUser ? 'font-semibold' : ''}>
              {user.name}
              {user.name === currentUser && ' (you)'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OnlineUsers;