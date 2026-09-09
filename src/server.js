import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';

import { supabase } from './config/db.js';
import { redis } from './config/redis.js';
import { initSocket } from './services/socketService.js';
import { rateLimiter } from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { setupSwagger, swaggerSpec } from './config/swagger.js';
import { initCronJobs } from './jobs/cronScheduler.js';

import apiRoutes from './routes/index.js';
import paymentRoutes from './routes/repaymentRoutes.js';

const app = express();
const server = http.createServer(app);

// 1. Security & Core Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-paystack-signature']
}));
app.use(express.json());
app.use(rateLimiter());

// 2. Documentation & WebSockets
setupSwagger(app);

// Expose raw OpenAPI JSON spec for Postman import
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

initSocket(server);
initCronJobs();

// 3. Centralized API Router & Explicit Payment/Webhook Routes
app.use('/api/v1', apiRoutes);
app.use('/api/v1/payments', paymentRoutes);

// 4. Health Check Endpoint
app.get('/health', async (req, res) => {
    try {
        const { error } = await supabase.from('users').select('id').limit(1);
        if (error) throw error;
        res.status(200).json({ status: 'ok', database: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'error', database: err.message });
    }
});

// 5. Global Error Handler (Must be registered after all routes)
app.use(errorHandler);

// 6. Start Server
const PORT = process.env.PORT || 5000;

const start = async () => {
    try {
        if (process.env.REDIS_URL) {
            await redis.connect();
            console.log('✅ Redis connected successfully');
        } else {
            console.warn('⚠️ REDIS_URL not found. Skipping Redis connection.');
        }

        server.listen(PORT, () => {
            console.log(`AfriCredit Platform API running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to initialize server:', err);
        process.exit(1);
    }
};

start();