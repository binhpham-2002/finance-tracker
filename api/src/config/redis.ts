import Redis from "ioredis";
import { config } from "./env";

const redis = new Redis(config.redisUrl);

redis.on("connect", () => {
  console.log("Redis connected");
});

redis.on("error", (err) => {
  console.error("Redis error:", err.message);
});

export { redis };
