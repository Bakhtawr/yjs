export function generateColorFromUID(uid: string): string {
    let hash = 0;
    for (let i = 0; i < uid.length; i++) {
      hash = uid.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 60%)`;
  }
  
  export function getInitials(name: string): string {
    return name.split(' ').map(part => part[0]).join('').toUpperCase();
  }