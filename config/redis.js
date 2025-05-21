import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

export const createRedisClients = async () => {
  const redisHost = process.env.REDIS_HOST_P || "127.0.0.1";
  const redisPort = parseInt(process.env.REDIS_PORT_P, 10) || 6379;
  const redisPassword = process.env.REDIS_PASSWORD_P || undefined;

  const pubClient = new Redis({
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  });

  const subClient = pubClient.duplicate();

  pubClient.on("error", (err) => {
    console.error("❌ Redis pubClient error:", err.message);
  });

  subClient.on("error", (err) => {
    console.error("❌ Redis subClient error:", err.message);
  });

  pubClient.on("connect", () => {
    console.log("✅ Redis pubClient connected!");
  });

  subClient.on("connect", () => {
    console.log("✅ Redis subClient connected!");
  });

  return { pubClient, subClient };
};