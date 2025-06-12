import React from 'react';

interface Comment {
  text: string;
  author: string;
  timestamp: string;
  id: string;
  replies: Comment[];
  isEditing?: boolean;
}

interface CommentListProps {
  comments: Comment[];
  user: string;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  replyText: string;
  setReplyText: (text: string) => void;
  editingComment: {id: string, text: string} | null;
  setEditingComment: (comment: {id: string, text: string} | null) => void;
  onAddComment: () => void;
  onDeleteComment: (id: string, isReply: boolean, parentId?: string) => void;
  onStartEditing: (comment: Comment, isReply: boolean, parentId?: string) => void;
  onSaveEdit: (isReply: boolean, parentId?: string) => void;
  onCancelEdit: (isReply: boolean, parentId?: string) => void;
}

const CommentList: React.FC<CommentListProps> = ({
  comments,
  user,
  replyingTo,
  setReplyingTo,
  replyText,
  setReplyText,
  editingComment,
  setEditingComment,
  onAddComment,
  onDeleteComment,
  onStartEditing,
  onSaveEdit,
  onCancelEdit
}) => {
  const renderComments = (commentsToRender: Comment[] = [], depth = 0, parentId?: string) => {
    return commentsToRender.map((comment) => {
      const replies = Array.isArray(comment.replies) ? comment.replies : [];
      const isCurrentUser = comment.author === user;
      
      return (
        <div 
          key={comment.id} 
          className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-fadeIn ${
            depth > 0 ? 'ml-6 mt-2' : 'mt-4'
          } transition-all duration-200 hover:shadow-md`}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                    {comment.author.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {comment.author}
                    {isCurrentUser && (
                      <span className="ml-1 text-xs text-blue-600">(you)</span>
                    )}
                  </h4>
                  <span className="text-xs text-gray-500">{comment.timestamp}</span>
                </div>
              </div>
              
              {isCurrentUser && !comment.isEditing && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => onStartEditing(comment, depth > 0, parentId)}
                    className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                    title="Edit"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDeleteComment(comment.id, depth > 0, parentId)}
                    className="text-xs text-gray-500 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            
            {comment.isEditing ? (
              <div className="pl-10">
                <textarea
                  value={editingComment?.text || ''}
                  onChange={(e) => setEditingComment({...editingComment!, text: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  autoFocus
                />
                <div className="flex justify-end space-x-2 mt-2">
                  <button
                    onClick={() => onCancelEdit(depth > 0, parentId)}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => onSaveEdit(depth > 0, parentId)}
                    disabled={!editingComment?.text.trim()}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      editingComment?.text.trim() 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-700 pl-10">{comment.text}</p>
            )}
    
            <div className="flex items-center mt-3 pl-10">
              <button
                onClick={() => setReplyingTo(comment.id === replyingTo ? null : comment.id)}
                className="flex items-center text-blue-500 hover:text-blue-700 text-xs transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {comment.id === replyingTo ? 'Cancel' : 'Reply'}
              </button>
              {replies.length > 0 && (
                <span className="ml-3 text-xs text-gray-500">
                  {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </span>
              )}
            </div>
    
            {replies.length > 0 && (
              <div className="mt-2">
                {renderComments(replies, depth + 1, comment.id)}
              </div>
            )}

            {replyingTo === comment.id && (
              <div className="mt-3 pl-10">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your reply..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  autoFocus
                />
                <div className="flex justify-end space-x-2 mt-1">
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onAddComment}
                    disabled={!replyText.trim()}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      replyText.trim() 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Reply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    });
  };

  return <div className="space-y-4">{renderComments(comments)}</div>;
};

export default CommentList;