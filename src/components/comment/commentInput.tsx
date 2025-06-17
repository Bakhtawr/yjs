import React from 'react';

interface CommentInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onSubmit: () => void;
  isProcessing: boolean;
}

const CommentInput: React.FC<CommentInputProps> = ({
  value,
  onChange,
  onKeyPress,
  onSubmit,
  isProcessing
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md">
      <div className="p-2">
        <textarea
          value={value}
          onChange={onChange}
          onKeyPress={onKeyPress}
          placeholder="Share your thoughts..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
      </div>
      <div className="flex justify-between items-center bg-gray-50 px-4 py-2 border-t border-gray-200">
        <span className="text-xs text-gray-500">Press Enter to post</span>
        <button
          onClick={onSubmit}
          disabled={!value.trim() || isProcessing}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            value.trim() && !isProcessing
              ? 'bg-blue-600 text-white shadow hover:bg-blue-700 hover:shadow-md' 
              : 'bg-gray-200 text-black cursor-not-allowed'
          }`}
        >
          {isProcessing ? 'Posting...' : 'Post Comment'}
        </button>
      </div>
    </div>
  );
};

export default CommentInput;
