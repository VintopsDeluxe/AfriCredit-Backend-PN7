// src/jobs/reminderJob.js
import { Queue, Worker } from 'bullmq';
import { NotificationService } from '../services/notificationService.js';

// Safely parse REDIS_URL for BullMQ connection options
const getRedisConnection = () => {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        throw new Error('❌ REDIS_URL environment variable is missing.');
    }
    
    const url = new URL(redisUrl);
    return {
        host: url.hostname,
        port: Number(url.port) || 6379,
        username: url.username || undefined,
        password: url.password || undefined,
        tls: url.protocol === 'rediss:' ? { rejectUnauthorized: false } : undefined,
    };
};

const connection = getRedisConnection();

// 1. Create the Loan Reminder Queue
export const loanReminderQueue = new Queue('loan-reminders', { connection });

// 2. Create the Worker to process queued reminders
export const reminderWorker = new Worker(
    'loan-reminders',
    async (job) => {
        const { email, phone, borrowerName, amount, dueDate } = job.data;

        console.log(`⏳ Processing repayment reminder for: ${email || phone}`);

        // Dispatch via your existing NotificationService
        await NotificationService.sendSMS(
            phone,
            `Dear ${borrowerName || 'Customer'}, your loan repayment of NGN ${amount} is due on ${dueDate}. Please fund your account to avoid penalties.`
        );

        await NotificationService.sendEmail(
            email,
            'Loan Repayment Reminder 🔔',
            `Hello ${borrowerName || 'Customer'},\n\nThis is a friendly reminder that your loan repayment of NGN ${amount} is due on ${dueDate}.\n\nThank you for choosing AfriCredit.`
        );
    },
    { connection, concurrency: 5 }
);

reminderWorker.on('completed', (job) => {
    console.log(`✅ Reminder job ${job.id} completed successfully.`);
});

reminderWorker.on('failed', (job, err) => {
    console.error(`Reminder job ${job.id} failed:`, err.message);
});gi