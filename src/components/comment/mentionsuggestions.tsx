// components/MentionSuggestions.tsx
import React from 'react';

interface MentionSuggestionsProps {
  users: { name: string }[];
  onSelect: (username: string) => void;
  position: { top: number; left: number };
  query: string;
}

export const MentionSuggestions: React.FC<MentionSuggestionsProps> = ({
  users,
  onSelect,
  position,
  query
}) => {
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(query.toLowerCase())
  );

  if (!filteredUsers.length) return null;

  return (
    <div 
      className="absolute z-10 mt-1 w-48 rounded-md bg-white shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      <ul className="py-1">
        {filteredUsers.map(user => (
          <li
            key={user.name}
            className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
            onClick={() => onSelect(user.name)}
          >
            {user.name}
          </li>
        ))}
      </ul>
    </div>
  );
};