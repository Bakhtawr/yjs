import React, { useState, useRef, useEffect } from 'react';
import type { User } from '../../yjsSetup';

interface CommentInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onValueChange: (newText: string) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onSubmit: () => void;
  isProcessing: boolean;
  users: User[];
  currentUserId?: string;
  onMentionInsert?: (text: string) => void;
}

const CommentInput: React.FC<CommentInputProps> = ({
  value,
  onChange,
  onValueChange,
  onKeyPress,
  onSubmit,
  isProcessing,
  users,
  currentUserId
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [, setMentionQuery] = useState('');
  const [, setMentionPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onChange(e);
    
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtPos >= 0 && /^[\w@]$/.test(textBeforeCursor.charAt(lastAtPos + 1))) {
      const query = textBeforeCursor.substring(lastAtPos + 1, cursorPos);
      setMentionQuery(query);
      setMentionPosition(lastAtPos);
      setShowSuggestions(true);
      
      const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(query.toLowerCase()) && 
        u.id !== currentUserId
      );
      setSuggestions(filteredUsers);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleMentionSelect = (user: User) => {
    if (!textareaRef.current) return;
    
    const text = value;
    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const textAfterCursor = text.substring(cursorPos);
    
    // Find the last '@' before cursor
    const lastAtPos = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtPos === -1) return; // No '@' found
    
    // Replace from '@' to cursor position with the mentioned username
    const newText = 
      textBeforeCursor.substring(0, lastAtPos) + 
      `@${user.name}` + 
      textAfterCursor;
    
    onValueChange(newText);
    setShowSuggestions(false);
    
    // Focus and set cursor after the mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = lastAtPos + user.name.length + 1; // +1 for '@'
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation in suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        // Implement keyboard navigation if needed
        if (e.key === 'Enter' && suggestions.length === 1) {
          handleMentionSelect(suggestions[0]);
        }
      }
    }
    onKeyPress(e);
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={3}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        placeholder="Write a comment..."
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
          {suggestions.map(user => (
            <div
              key={user.id}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
              onClick={() => handleMentionSelect(user)}
            >
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name}
                  className="h-6 w-6 rounded-full mr-2"
                />
              ) : (
                <div 
                  className="h-6 w-6 rounded-full mr-2 flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name.charAt(0)}
                </div>
              )}
              <span>{user.name}</span>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-2 flex justify-end">
        <button
          onClick={onSubmit}
          disabled={isProcessing || !value.trim()}
          className={`px-4 py-2 rounded-md font-medium ${
            !isProcessing && value.trim()
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isProcessing ? 'Posting...' : 'Post'}
        </button>
      </div>
    </div>
  );
};

export default CommentInput;