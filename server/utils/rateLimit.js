import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { getRedisClient } from "../config/redis.js";

export const createRateLimiter = (options) => {
  const client = getRedisClient();
  const store = client
    ? new RedisStore({
        sendCommand: (...args) => client.sendCommand(args),
        prefix: options.prefix || "rl:",
      })
    : undefined;

  const { prefix, ...limiterOptions } = options;
  return rateLimit({ ...limiterOptions, store });
};
