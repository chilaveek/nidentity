/**
 * Format ISO date string to Russian short date with time.
 * Example: "5 апр., 14:32"
 */
export function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format number as Russian price string with ₽ symbol.
 * Example: "1 200 ₽"
 */
export function formatPrice(n: number): string {
  return `${n.toLocaleString('ru-RU')} ₽`;
}
