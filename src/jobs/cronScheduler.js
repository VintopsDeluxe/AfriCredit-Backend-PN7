// src/jobs/cronScheduler.js
import cron from 'node-cron';
import supabase from '../utils/supabaseClient.js';
import { loanReminderQueue } from './reminderJob.js';

/**
 * Scan database for due loans and queue reminders
 */
const checkDueLoansAndQueueReminders = async () => {
  try {
    console.log('⏰ Running daily loan due date checker...');

    const today = new Date().toISOString().split('T')[0];

    const { data: dueRepayments, error } = await supabase
      .from('repayments')
      .select('amount, due_date, loans(user_id, users(email, phone_number, full_name))')
      .eq('status', 'pending')
      .lte('due_date', today);

    if (error) throw error;

    if (!dueRepayments || dueRepayments.length === 0) {
      console.log('ℹ️ No due loans found for today.');
      return;
    }

    console.log(`📢 Found ${dueRepayments.length} due loans. Enqueuing reminders...`);

    for (const repayment of dueRepayments) {
      const user = repayment.loans?.users;
      if (!user) continue;

      await loanReminderQueue.add('send-reminder', {
        email: user.email,
        phone: user.phone_number,
        borrowerName: user.full_name,
        amount: repayment.amount,
        dueDate: repayment.due_date,
      });
    }
  } catch (err) {
    console.error('❌ Cron job error while scanning due loans:', err.message);
  }
};

/**
 * Initialize Cron Schedules
 */
export const initCronJobs = () => {
  cron.schedule('0 8 * * *', () => {
    checkDueLoansAndQueueReminders();
  });

  console.log('Loan reminder cron scheduler initialized (Runs daily at 08:00 AM).');
};

export default initCronJobs;