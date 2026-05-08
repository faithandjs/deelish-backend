import NodeCache from "node-cache";

const ttl = Number(process.env.CACHE_TTL_SECONDS ?? 60);

export const cache = new NodeCache({ stdTTL: ttl, checkperiod: ttl * 2 });

export function cached<T>(key: string, fetcher: () => T): T {
  const hit = cache.get<T>(key);
  if (hit !== undefined) return hit;
  const value = fetcher();
  cache.set(key, value);
  return value;
}

export function invalidate(...keys: string[]) {
  cache.del(keys);
}
