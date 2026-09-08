// src/middlewares/verifyWebhook.js
import crypto from 'crypto';
import { AppError } from '../utils/AppError.js';

export const verifyPaystackWebhook = (req, res, next) => {
    const hash = crypto
        .createHmac('sha512', process.env.WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
        return next(new AppError('Invalid webhook signature', 400, true, 'INVALID_SIGNATURE'));
    }
    next();
};