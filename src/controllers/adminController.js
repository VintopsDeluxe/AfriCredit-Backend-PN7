// src/controllers/adminController.js
import { supabase } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { NotificationService } from '../services/notificationService.js';

const logAuditAction = async ({ adminId, action, targetId, details = {} }) => {
  try {
    await supabase.from('audit_logs').insert([{
      admin_id: adminId || null, action, target_id: targetId, details, created_at: new Date().toISOString()
    }]);
  } catch (err) {
    console.error('⚠️ Audit Logging Error:', err.message);
  }
};

export const getReviewQueue = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('loans').select('*, users(email, phone_number)').eq('status', 'under_review').order('created_at', { ascending: false });
    if (error) throw error;
    res.status(200).json({ status: 'success', data });
  } catch (err) { next(err); }
};

export const getPendingApplications = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('loans').select('*, users(email, phone_number)').eq('status', 'pending').order('created_at', { ascending: false });
    if (error) throw error;
    res.status(200).json({ status: 'success', count: data.length, data });
  } catch (err) { next(err); }
};

export const getApprovedApplications = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('loans').select('*, users(email, phone_number)').eq('status', 'approved').order('created_at', { ascending: false });
    if (error) throw error;
    res.status(200).json({ status: 'success', count: data.length, data });
  } catch (err) { next(err); }
};

export const getBorrowers = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('users').select('id, email, phone_number, role, created_at').eq('role', 'borrower').order('created_at', { ascending: false });
    if (error) throw error;
    res.status(200).json({ status: 'success', count: data.length, data });
  } catch (err) { next(err); }
};

export const getDisbursementTotals = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('loans').select('amount, status').in('status', ['disbursed', 'active', 'completed']);
    if (error) throw error;
    const totalDisbursed = data.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
    res.status(200).json({ status: 'success', data: { totalDisbursed, totalDisbursedCount: data.length } });
  } catch (err) { next(err); }
};

export const getRepaymentStatistics = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('repayments').select('amount_paid, status, due_date');
    if (error) throw error;
    const totalCollected = data.filter(r => r.status === 'paid').reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);
    const pendingCollection = data.filter(r => r.status === 'pending').reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);
    res.status(200).json({ status: 'success', data: { totalCollected, pendingCollection, totalRecords: data.length } });
  } catch (err) { next(err); }
};

export const getOverdueLoans = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('loans').select('*, users(email, phone_number)').eq('status', 'overdue').order('due_date', { ascending: true });
    if (error) throw error;
    res.status(200).json({ status: 'success', count: data.length, data });
  } catch (err) { next(err); }
};

export const getRiskFlags = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('risk_flags').select('*, users(email, phone_number)').order('created_at', { ascending: false });
    if (error) throw error;
    res.status(200).json({ status: 'success', count: data.length, data });
  } catch (err) { next(err); }
};

export const reviewDecision = async (req, res, next) => {
  try {
    const { loanId, decision, notes } = req.body;
    const adminId = req.user?.id;
    if (!loanId || !decision) return next(new AppError('Loan ID and decision are required', 400));
    const newStatus = decision === 'approve' ? 'approved' : 'rejected';
    const { data: updatedLoan, error } = await supabase.from('loans').update({ status: newStatus, review_notes: notes, reviewed_by: adminId, updated_at: new Date().toISOString() }).eq('id', loanId).select('*, users(email, phone_number)').single();
    if (error || !updatedLoan) throw error || new AppError('Loan not found', 404);
    await logAuditAction({ adminId, action: `LOAN_${newStatus.toUpperCase()}`, targetId: loanId, details: { notes, previousStatus: 'under_review' } });
    await NotificationService.sendLoanStatusNotification({ email: updatedLoan.users?.email, phone: updatedLoan.users?.phone_number, status: newStatus, amount: updatedLoan.amount, reason: notes });
    res.status(200).json({ status: 'success', data: updatedLoan });
  } catch (err) { next(err); }
};

export const escalateCase = async (req, res, next) => {
  try {
    const { loanId, reason } = req.body;
    const adminId = req.user?.id;
    if (!loanId || !reason) return next(new AppError('Loan ID and reason are required', 400));
    const { data: updatedLoan, error } = await supabase.from('loans').update({ status: 'escalated', escalation_reason: reason, updated_at: new Date().toISOString() }).eq('id', loanId).select().single();
    if (error || !updatedLoan) throw error || new AppError('Loan not found', 404);
    await logAuditAction({ adminId, action: 'LOAN_ESCALATED', targetId: loanId, details: { reason } });
    res.status(200).json({ status: 'success', data: updatedLoan });
  } catch (err) { next(err); }
};

export const overrideDecision = async (req, res, next) => {
  try {
    const { loanId, newStatus, reason } = req.body;
    const adminId = req.user?.id;
    if (!loanId || !newStatus || !reason) return next(new AppError('Loan ID, new status, and reason are required', 400));
    const { data: updatedLoan, error } = await supabase.from('loans').update({ status: newStatus, override_reason: reason, overridden_by: adminId, updated_at: new Date().toISOString() }).eq('id', loanId).select('*, users(email, phone_number)').single();
    if (error || !updatedLoan) throw error || new AppError('Loan not found', 404);
    await logAuditAction({ adminId, action: 'LOAN_OVERRIDE', targetId: loanId, details: { newStatus, reason } });
    await NotificationService.sendLoanStatusNotification({ email: updatedLoan.users?.email, phone: updatedLoan.users?.phone_number, status: newStatus, amount: updatedLoan.amount, reason });
    res.status(200).json({ status: 'success', data: updatedLoan });
  } catch (err) { next(err); }
};

export const getPortfolioAnalytics = async (req, res, next) => {
  try {
    const { data: loans, error } = await supabase.from('loans').select('status, amount');
    if (error) throw error;
    const totalPortfolioValue = loans.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const activeLoans = loans.filter(l => l.status === 'disbursed' || l.status === 'approved').length;
    res.status(200).json({ status: 'success', data: { totalLoans: loans.length, activeLoans, totalPortfolioValue } });
  } catch (err) { next(err); }
};

export const AdminController = {
  getReviewQueue, reviewDecision, escalateCase, overrideDecision, getPortfolioAnalytics,
  getPendingApplications, getApprovedApplications, getBorrowers, getDisbursementTotals,
  getRepaymentStatistics, getOverdueLoans, getRiskFlags
};

export default AdminController;