import { createClient } from "redis";

let client = null;

export const connectRedis = async () => {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.log("Redis not configured; using in-memory stores");
    return null;
  }

  client = createClient({ url });
  client.on("error", (error) => console.error("Redis error", error.message));

  await client.connect();
  console.log("Redis connected");
  return client;
};

export const getRedisClient = () => client;

export const createPubSubClients = async () => {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  const pubClient = createClient({ url });
  const subClient = pubClient.duplicate();

  pubClient.on("error", (error) => console.error("Redis pub client error", { error }));
  subClient.on("error", (error) => console.error("Redis sub client error", { error }));

  await Promise.all([pubClient.connect(), subClient.connect()]);
  return { pubClient, subClient };
};

export default connectRedis;
