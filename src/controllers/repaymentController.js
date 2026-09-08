// src/controllers/repaymentController.js
import { PaystackService } from '../services/paystackService.js';
import { supabase } from '../config/db.js';
import { AppError } from '../utils/AppError.js';

/**
 * Initiate a loan repayment transaction via Paystack
 */
export const initiateRepayment = async (req, res, next) => {
  try {
    const { loanId, amount } = req.body;
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    if (!loanId || !amount) {
      return next(new AppError('Loan ID and amount are required', 400));
    }

    const amountInKobo = Math.round(Number(amount) * 100);

    const paymentData = await PaystackService.initializeTransaction(
      userEmail,
      amountInKobo
    );

    res.status(200).json({
      status: 'success',
      data: paymentData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch repayment history for the authenticated user
 */
export const getRepaymentHistory = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    const { data, error } = await supabase
      .from('repayments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch repayment schedule for a specific loan
 */
export const getRepaymentSchedule = async (req, res, next) => {
  try {
    const { loanId } = req.params;

    const { data, error } = await supabase
      .from('repayment_schedules')
      .select('*')
      .eq('loan_id', loanId)
      .order('due_date', { ascending: true });

    if (error) throw error;

    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle incoming Paystack webhook events
 */
export const handlePaystackWebhook = async (req, res, next) => {
  try {
    const event = req.body;

    // Log the incoming event for debugging
    console.log(`Paystack Webhook Event Received: ${event?.event}`);

    // Handle successful charges
    if (event.event === 'charge.success') {
      const transactionData = event.data;
      const reference = transactionData.reference;
      const amountPaid = transactionData.amount / 100; // Convert from kobo to NGN

      console.log(`Processing successful payment of NGN ${amountPaid} with reference: ${reference}`);
      
      // TODO: Add your database updates here (e.g., mark loan repayment as paid in Supabase)
    }

    // Always respond with 200 OK quickly to acknowledge receipt to Paystack
    return res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};

// Grouped controller export expected by repaymentRoutes.js
export const RepaymentController = {
  initiateRepayment,
  getRepaymentHistory,
  getRepaymentSchedule,
  handlePaystackWebhook,
};

export default RepaymentController;