/**
 * When a plant needs a new saved reading — shared by the plant screen and the
 * background monitor, so both follow the plant's "frequência de registro".
 */
export function isReadingDue(lastSavedAt: number | null, saveInterval: number, now: number): boolean {
  if (lastSavedAt === null) return true;
  return now - lastSavedAt >= saveInterval;
}

/** First retry 2 min after a failed connection (plant out of range), doubling up to 15 min. */
export const RETRY_BASE_MS = 2 * 60_000;
export const RETRY_MAX_MS = 15 * 60_000;

export function retryDelay(consecutiveFailures: number): number {
  if (consecutiveFailures <= 0) return 0;
  return Math.min(RETRY_BASE_MS * 2 ** (consecutiveFailures - 1), RETRY_MAX_MS);
}
