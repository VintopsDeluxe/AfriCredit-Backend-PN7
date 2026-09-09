import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    throw new Error('❌ REDIS_URL environment variable is missing. Check your .env file or environment settings.');
}

export const redis = createClient({
    url: redisUrl
});

redis.on('error', (err) => console.error('Redis Client Error:', err.message));

export const redisClient = redis;