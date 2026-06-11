import { getRedisClient } from "./client";

export { keys } from "./keys";
export { ttl } from "./ttl";

export async function cachedFn<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const hit = await redis.get(key);
      if (hit !== null) return JSON.parse(hit) as T;
    } catch {
      return fn();
    }
    const value = await fn();
    try {
      await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch {
      // Redis SET failed — value already computed, return it
    }
    return value;
  }
  return fn();
}

export const cache = {
  del: async (key: string): Promise<void> => {
    const redis = getRedisClient();
    if (!redis) return;
    try {
      await redis.del(key);
    } catch {
      // silent
    }
  },
};
