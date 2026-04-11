import { redis } from "../config/redis";

const DEFAULT_TTL = 300;

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export async function setCache(key: string, data: unknown, ttl = DEFAULT_TTL): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(data), "EX", ttl);
  } catch {

  }
}

export async function deleteCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch {

  }
}
