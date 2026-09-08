// src/config/redis.js
import { createClient } from 'redis';

export const redis = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.on('error', (err) => console.error('Redis Client Error', err));

// Alias both names so files importing either 'redis' or 'redisClient' will work
export const redisClient = redis;