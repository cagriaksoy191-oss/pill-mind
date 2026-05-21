// lib/redis.ts
import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (url && token) {
  try {
    redis = new Redis({
      url,
      token,
    });
    console.info("[Redis] Upstash Redis initialized successfully.");
  } catch (err) {
    console.error("[Redis] Failed to initialize Upstash Redis:", err);
  }
} else {
  console.info("[Redis] Upstash Redis environment variables are missing. Caching is disabled.");
}

export { redis };
