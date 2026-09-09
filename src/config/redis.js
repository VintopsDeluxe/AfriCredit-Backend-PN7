// src/config/redis.js
import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;

export const redis = createClient({
    url: redisUrl
});

redis.on('error', (err) => console.error('Redis Client Error:', err.message));

export const redisClient = redis;