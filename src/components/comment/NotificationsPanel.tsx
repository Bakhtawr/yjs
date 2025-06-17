import React from 'react';
import type { Notification } from '../../utils/yjs/notificationUtils';

interface NotificationsPanelProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onClose: () => void;
  currentUserId: string; // Add this prop
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ 
  notifications, 
  onMarkAsRead,
  onClearAll,
  onClose,
  currentUserId // Destructure the prop
}) => {
  // STRICT FILTERING
  const userNotifications = notifications.filter(n => 
    n.recipientId === currentUserId && n.author.id !== currentUserId
  );
  const handleNotificationClick = (notification: Notification) => {
    onMarkAsRead(notification.id);
    // Add any navigation logic here if needed
    console.log("Notification clicked:", notification);
  };

  const getNotificationMessage = (notification: Notification) => {
    switch (notification.type) {
      case 'mention':
        return `${notification.author.name} mentioned you`;
      case 'reply':
        return `${notification.author.name} replied to your comment`;
      default:
        return 'New notification';
    }
  };

  const hasUnreadNotifications = userNotifications.some(n => !n.read);

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">Notifications</h3>
        <div className="flex items-center space-x-2">
          {hasUnreadNotifications && (
            <button 
              onClick={onClearAll}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Mark all as read
            </button>
          )}
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
      {userNotifications.map(notification => (
      <div 
        key={notification.id}
        onClick={() => handleNotificationClick(notification)}
        className={`p-4 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
      >
        {/* Notification content */}
        <div className="flex items-start">
          {/* Avatar */}
          <div 
            className="h-8 w-8 rounded-full flex items-center justify-center text-white font-medium mr-3"
            style={{ backgroundColor: notification.author.color }}
          >
            {notification.author.name.charAt(0).toUpperCase()}
          </div>
          
          {/* Message and content */}
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {getNotificationMessage(notification)}
            </p>
            
            {/* Ensure content exists */}
            {notification.content ? (
              <p className="text-sm text-gray-500 mt-1 truncate">
                {notification.content}
              </p>
            ) : (
              <p className="text-sm text-gray-400 mt-1 italic">
                No preview available
              </p>
            )}
            
            <p className="text-xs text-gray-400 mt-1">
              {new Date(notification.timestamp).toLocaleString()}
            </p>
          </div>
          
          {/* Unread indicator */}
          {!notification.read && (
            <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
          )}
        </div>
      </div>
    ))}
      </div>
    </div>
  );
};

export default NotificationsPanel;