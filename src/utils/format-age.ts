/** "agora", "há 5 min", "há 3 h", "há 2 d" */
export function formatAge(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `há ${hours} h` : `há ${Math.round(hours / 24)} d`;
}
