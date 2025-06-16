import type { User } from './yjsSetup';

export const findMentions = (text: string, users: User[]): { userId: string, position: number, length: number }[] => {
  const mentions: { userId: string, position: number, length: number }[] = [];
  
  users.forEach(user => {
    const regex = new RegExp(`@${user.name}\\b`, 'g');
    let match;
    while ((match = regex.exec(text)) !== null) {
      mentions.push({
        userId: user.id,
        position: match.index,
        length: match[0].length
      });
    }
  });

  return mentions;
};

export const highlightMentions = (text: string, mentions: { userId: string, position: number, length: number }[], users: User[]) => {
  if (!mentions.length) return text;
  
  const parts = [];
  let lastIndex = 0;
  
  // Sort mentions by position
  const sortedMentions = [...mentions].sort((a, b) => a.position - b.position);
  
  sortedMentions.forEach(mention => {
    // Add text before mention
    if (mention.position > lastIndex) {
      parts.push(text.substring(lastIndex, mention.position));
    }
    
    // Add mention
    const user = users.find(u => u.id === mention.userId);
    if (user) {
      parts.push(
        `<span class="mention" data-user-id="${user.id}" style="color: ${user.color}; font-weight: bold;">@${user.name}</span>`
      );
    } else {
      parts.push(text.substring(mention.position, mention.position + mention.length));
    }
    
    lastIndex = mention.position + mention.length;
  });
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.join('');
};