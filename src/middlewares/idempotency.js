// src/middlewares/idempotency.js
import redisClient from '../utils/redisClient.js';
import { AppError } from '../utils/AppError.js';

export const idempotency = () => {
    return async (req, res, next) => {
        const idempotencyKey = req.headers['x-idempotency-key'];

        if (!idempotencyKey) {
            return next(new AppError('X-Idempotency-Key header is required for this request', 400, true, 'MISSING_IDEMPOTENCY_KEY'));
        }

        try {
            const cachedResponse = await redisClient.get(`idempotency:${idempotencyKey}`);

            if (cachedResponse) {
                // Return cached response if request was already processed
                const parsed = JSON.parse(cachedResponse);
                return res.status(parsed.status).json(parsed.body);
            }

            // Capture original res.json to cache the response later
            const originalJson = res.json.bind(res);
            res.json = async (body) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    await redisClient.setEx(
                        `idempotency:${idempotencyKey}`,
                        86400, // Cache for 24 hours
                        JSON.stringify({ status: res.statusCode, body })
                    );
                }
                return originalJson(body);
            };

            next();
        } catch (err) {
            next(err);
        }
    };
};