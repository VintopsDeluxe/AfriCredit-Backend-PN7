// src/controllers/adminController.js
import { supabase } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { NotificationService } from '../services/notificationService.js';

/**
 * Helper: Insert Compliance Audit Log into Supabase
 */
const logAuditAction = async ({ adminId, action, targetId, details = {} }) => {
  try {
    await supabase.from('audit_logs').insert([
      {
        admin_id: adminId || null,
        action,
        target_id: targetId,
        details,
        created_at: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    console.error('⚠️ Audit Logging Error:', err.message);
  }
};

/**
 * Fetch loan applications pending risk review
 */
export const getReviewQueue = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('loans')
      .select('*, users(email, phone_number)')
      .eq('status', 'under_review')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
};

/**
 * Record underwriting decision (approve/reject)
 */
export const reviewDecision = async (req, res, next) => {
  try {
    const { loanId, decision, notes } = req.body;
    const adminId = req.user?.id;

    if (!loanId || !decision) {
      return next(new AppError('Loan ID and decision are required', 400));
    }

    const newStatus = decision === 'approve' ? 'approved' : 'rejected';

    const { data: updatedLoan, error } = await supabase
      .from('loans')
      .update({
        status: newStatus,
        review_notes: notes,
        reviewed_by: adminId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', loanId)
      .select('*, users(email, phone_number)')
      .single();

    if (error || !updatedLoan) throw error || new AppError('Loan not found', 404);

    // 1. Audit Log
    await logAuditAction({
      adminId,
      action: `LOAN_${newStatus.toUpperCase()}`,
      targetId: loanId,
      details: { notes, previousStatus: 'under_review' },
    });

    // 2. Trigger Real-time Notification to Borrower
    await NotificationService.sendLoanStatusNotification({
      email: updatedLoan.users?.email,
      phone: updatedLoan.users?.phone_number,
      status: newStatus,
      amount: updatedLoan.amount,
      reason: notes,
    });

    res.status(200).json({ status: 'success', data: updatedLoan });
  } catch (err) {
    next(err);
  }
};

/**
 * Escalate a review case to senior risk officers
 */
export const escalateCase = async (req, res, next) => {
  try {
    const { loanId, reason } = req.body;
    const adminId = req.user?.id;

    if (!loanId || !reason) {
      return next(new AppError('Loan ID and reason are required', 400));
    }

    const { data: updatedLoan, error } = await supabase
      .from('loans')
      .update({
        status: 'escalated',
        escalation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', loanId)
      .select()
      .single();

    if (error || !updatedLoan) throw error || new AppError('Loan not found', 404);

    // Audit Log
    await logAuditAction({
      adminId,
      action: 'LOAN_ESCALATED',
      targetId: loanId,
      details: { reason },
    });

    res.status(200).json({ status: 'success', data: updatedLoan });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin override on loan underwriting decisions
 */
export const overrideDecision = async (req, res, next) => {
  try {
    const { loanId, newStatus, reason } = req.body;
    const adminId = req.user?.id;

    if (!loanId || !newStatus || !reason) {
      return next(new AppError('Loan ID, new status, and reason are required', 400));
    }

    const { data: updatedLoan, error } = await supabase
      .from('loans')
      .update({
        status: newStatus,
        override_reason: reason,
        overridden_by: adminId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', loanId)
      .select('*, users(email, phone_number)')
      .single();

    if (error || !updatedLoan) throw error || new AppError('Loan not found', 404);

    // 1. Audit Log
    await logAuditAction({
      adminId,
      action: 'LOAN_OVERRIDE',
      targetId: loanId,
      details: { newStatus, reason },
    });

    // 2. Trigger Real-time Notification
    await NotificationService.sendLoanStatusNotification({
      email: updatedLoan.users?.email,
      phone: updatedLoan.users?.phone_number,
      status: newStatus,
      amount: updatedLoan.amount,
      reason,
    });

    res.status(200).json({ status: 'success', data: updatedLoan });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch portfolio risk and analytics summary
 */
export const getPortfolioAnalytics = async (req, res, next) => {
  try {
    const { data: loans, error } = await supabase.from('loans').select('status, amount');

    if (error) throw error;

    const totalPortfolioValue = loans.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const activeLoans = loans.filter((l) => l.status === 'disbursed' || l.status === 'approved').length;

    res.status(200).json({
      status: 'success',
      data: {
        totalLoans: loans.length,
        activeLoans,
        totalPortfolioValue,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const AdminController = {
  getReviewQueue,
  reviewDecision,
  escalateCase,
  overrideDecision,
  getPortfolioAnalytics,
};

export default AdminController;