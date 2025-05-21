import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export const createRedisClients = async () => {
  const redisHost = process.env.REDIS_HOST_P;
  const redisPort = process.env.REDIS_PORT_P;
  const redisPassword = process.env.REDIS_PASSWORD_P;

  // Create primary Redis client (publisher)
  const pubClient = new Redis({
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  });

  // Duplicate client for subscription
  const subClient = pubClient.duplicate();

  // Error handlers
  pubClient.on('error', (err) => {
    console.error('❌ Redis pubClient error:', err.message);
  });

  subClient.on('error', (err) => {
    console.error('❌ Redis subClient error:', err.message);
  });

  // Connection logs
  pubClient.on('connect', () => {
    console.log('✅ Redis pubClient connected!');
  });

  subClient.on('connect', () => {
    console.log('✅ Redis subClient connected!');
  });

  // Close handlers (optional)
  pubClient.on('close', () => {
    console.log('🔒 Redis pubClient connection closed');
  });

  subClient.on('close', () => {
    console.log('🔒 Redis subClient connection closed');
  });

  return { pubClient, subClient };
};
