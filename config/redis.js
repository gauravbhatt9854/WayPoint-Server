import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export const createRedisClients = async () => {

    const redisHost = process.env.REDIS_HOST_P
    const redisPort = process.env.REDIS_PORT_P
    const redisPassword = process.env.REDIS_PASSWORD_P

    // Creating pub/sub clients for Redis
    const pubClient = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    const subClient = pubClient.duplicate();

    // Error Handling for pubClient
    pubClient.on('error', (err) => {
        console.error('❌ Redis pubClient error:', err.message);
    });

    // Error Handling for subClient
    subClient.on('error', (err) => {
        console.error('❌ Redis subClient error:', err.message);
    });

    // Connection success logs
    pubClient.on('connect', () => {
        console.log('✅ Redis pubClient connected!');
    });

    subClient.on('connect', () => {
        console.log('✅ Redis subClient connected!');
    });

    // Optional: Add `close` handlers to gracefully close connections when needed
    pubClient.on('close', () => {
        console.log('🔒 Redis pubClient connection closed');
    });

    subClient.on('close', () => {
        console.log('🔒 Redis subClient connection closed');
    });

    // Returning pubClient and subClient for use in other parts of the application
    return { pubClient, subClient };
};