// src/jobs/reminderJob.js
import { Queue, Worker } from 'bullmq';
import { NotificationService } from '../services/notificationService.js';

// Reuse your existing Redis connection options
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

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
      (`Dear ${borrowerName || 'Customer'}, your loan repayment of NGN ${amount} is due on ${dueDate}. Please fund your account to avoid penalties.`)
    );

    await NotificationService.sendEmail(
      email,
      'Loan Repayment Reminder 🔔',
      (`Hello ${borrowerName || 'Customer'},\n\nThis is a friendly reminder that your loan repayment of NGN ${amount} is due on ${dueDate}.\n\nThank you for choosing AfriCredit.`)
    );
  },
  { connection, concurrency: 5 }
);

reminderWorker.on('completed', (job) => {
  console.log(`✅ Reminder job ${job.id} completed successfully.`);
});

reminderWorker.on('failed', (job, err) => {
  console.error(`Reminder job ${job.id} failed:`, err.message);
});