/**
 * Простой клиентский rate-limit (не замена серверного)
 */
const buckets = new Map<string, number[]>();

/**
 * @returns true если действие разрешено
 */
export function clientRateLimit(
  key: string,
  max: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const prev = buckets.get(key) ?? [];
  const recent = prev.filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
  return true;
}
