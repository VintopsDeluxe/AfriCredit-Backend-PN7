// src/middlewares/rateLimiter.js
import rateLimit from 'express-rate-limit';

/**
 * Configurable Express Rate Limiter
 * @param {Object} options Configuration options
 * @param {number} options.windowMs Time window in milliseconds (default: 15 mins)
 * @param {number} options.max Maximum requests per window (default: 500)
 * @param {string} options.message Custom error message
 */
export const rateLimiter = (options = {}) => {
    return rateLimit({
        windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
        max: options.max || 500, // Default to 500 requests per window for testing
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            return res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: options.message || 'Too many requests, please try again later.'
                }
            });
        }
    });
};

export default rateLimiter;