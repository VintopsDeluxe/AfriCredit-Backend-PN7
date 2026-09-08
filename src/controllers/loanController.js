// src/controllers/loanController.js
import { supabase } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { FraudService } from '../services/fraudService.js';

/**
 * Apply for a new loan
 */
export const applyForLoan = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { amount, tenureMonths, purpose, bvn, payoutDestinationAccount, payoutDestinationType } = req.body;

    if (!amount || !tenureMonths || !payoutDestinationAccount) {
      return next(new AppError('Amount, tenure in months, and payout destination account are required', 400));
    }

    // 1. Run Fraud Detection Evaluation
    const fraudAssessment = await FraudService.evaluateFraudRisk({ userId, bvn, amount });

    if (fraudAssessment.isFraudulent) {
      return next(
        new AppError(`Application flagged by Fraud Engine: ${fraudAssessment.flags.join(' ')}`, 400)
      );
    }

    // 2. Check for existing active or pending loan
    const { data: existingLoan, error: checkError } = await supabase
      .from('loans')
      .select('id')
      .eq('user_id', userId)
      .in('status', ['pending', 'under_review', 'approved', 'disbursed'])
      .maybeSingle();

    if (checkError) throw checkError;

    if (existingLoan) {
      return next(new AppError('You already have an active or pending loan application', 400));
    }

    // 3. Define Financial Calculations & Due Date
    const interestRate = 15.00;
    const totalRepayable = Number(amount) * (1 + (interestRate / 100) * (tenureMonths / 12));
    
    // Calculate due date based on tenure months
    const createdAtDate = new Date();
    const dueDate = new Date(createdAtDate);
    dueDate.setMonth(dueDate.getMonth() + Number(tenureMonths));

    // 4. Insert Loan Record with due_date
    const { data, error } = await supabase
      .from('loans')
      .insert([
        {
          user_id: userId,
          principal_amount: amount,
          tenure_months: tenureMonths,
          purpose,
          interest_rate: interestRate,
          total_repayable: totalRepayable,
          outstanding_balance: totalRepayable,
          payout_destination_account: payoutDestinationAccount,
          payout_destination_type: payoutDestinationType || 'bank_account',
          due_date: dueDate.toISOString(), // Added due_date
          status: 'under_review',
          risk_score: fraudAssessment.riskScore,
          created_at: createdAtDate.toISOString(),
        },
      ])
      .select();

    if (error) throw error;

    // 5. Record application attempt for velocity tracking
    await FraudService.recordApplicationAttempt(userId);

    res.status(201).json({ status: 'success', data: data[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * Accept an approved loan offer
 */
export const acceptOffer = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { loanId } = req.body;

    if (!loanId) {
      return next(new AppError('Loan ID is required', 400));
    }

    const { data, error } = await supabase
      .from('loans')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', loanId)
      .eq('user_id', userId)
      .eq('status', 'approved')
      .select();

    if (error || !data.length) {
      return next(new AppError('Loan offer not found or not eligible for acceptance', 400));
    }

    res.status(200).json({ status: 'success', data: data[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch the currently active loan for the user
 */
export const getActiveLoan = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['under_review', 'approved', 'accepted', 'disbursed'])
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (error) throw error;

    res.status(200).json({ status: 'success', data: data || null });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch loan history for the user
 */
export const getLoanHistory = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch status of a specific loan by ID
 */
export const getLoanStatus = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return next(new AppError('Loan not found', 404));
    }

    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
};

// Grouped exports
export const LoanController = {
  applyForLoan,
  acceptOffer,
  getActiveLoan,
  getLoanHistory,
  getLoanStatus,
};

export default LoanController;