import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { _redisClient?: Redis };

export function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (globalForRedis._redisClient) return globalForRedis._redisClient;
  const client = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    connectTimeout: 500,
  });
  client.on("error", () => {
    // intentional: fall-through handled in cachedFn
  });
  globalForRedis._redisClient = client;
  return client;
}
