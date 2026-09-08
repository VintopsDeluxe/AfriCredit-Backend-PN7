// src/controllers/borrowerController.js
import supabase from '../utils/supabaseClient.js';
import { AppError } from '../utils/AppError.js';
import { encryptData } from '../utils/encryption.js';
import { AggregatorService } from '../services/aggregatorService.js';

export class BorrowerController {
    
    // 1. Verify KYC (BVN/NIN Identity Verification)
    static async verifyKYC(req, res, next) {
        try {
            const userId = req.user.id;
            const { bvn, nin } = req.body;

            if (!bvn && !nin) {
                return next(new AppError('Either BVN or NIN must be provided', 400, true, 'MISSING_FIELDS'));
            }

            const idNumber = bvn || nin;
            const idType = bvn ? 'bvn' : 'nin';

            // Call external identity aggregator
            let verificationResult;
            try {
                verificationResult = await AggregatorService.verifyIdentity(idNumber, idType);
            } catch (aggError) {
                return next(new AppError(`Identity validation failed: ${aggError.message}`, 502, true, 'AGGREGATOR_ERROR'));
            }

            // Encrypt sensitive IDs before saving
            const encryptedBvn = bvn ? encryptData(bvn) : null;
            const encryptedNin = nin ? encryptData(nin) : null;

            // Save KYC record
            const { error: upsertError } = await supabase
                .from('kyc_verifications')
                .upsert({
                    user_id: userId,
                    bvn_encrypted: encryptedBvn,
                    nin_encrypted: encryptedNin,
                    status: 'verified',
                    verified_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (upsertError) throw upsertError;

            // Upgrade user tier to Tier 2
            await supabase
                .from('users')
                .update({ current_tier: 2, tier_max_amount: 250.00 })
                .eq('id', userId);

            return res.status(200).json({
                success: true,
                message: 'Identity successfully verified and user upgraded to Tier 2.',
                data: { current_tier: 2, tier_max_amount: 250.00, verification: verificationResult }
            });
        } catch (err) {
            next(err);
        }
    }

    // 2. Record User Data Consent (Regulatory compliance)
    static async recordConsent(req, res, next) {
        try {
            const userId = req.user.id;
            const { consent_type, granted } = req.body;

            const { data, error } = await supabase
                .from('user_consents')
                .insert([{
                    user_id: userId,
                    consent_type: consent_type || 'data_privacy_and_credit_bureau',
                    granted: granted ?? true,
                    ip_address: req.ip,
                    granted_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;

            return res.status(201).json({
                success: true,
                message: 'Consent recorded successfully.',
                data
            });
        } catch (err) {
            next(err);
        }
    }

    // 3. Apply for a Loan
    static async applyForLoan(req, res, next) {
        try {
            const userId = req.user.id;
            const { amount, tenor_months, purpose } = req.body;

            if (!amount || !tenor_months || !purpose) {
                return next(new AppError('Amount, tenor, and purpose are required', 400, true, 'MISSING_FIELDS'));
            }

            // Fetch user limits and active loan check
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('current_tier, tier_max_amount, is_blocked')
                .eq('id', userId)
                .single();

            if (userError || !user || user.is_blocked) {
                return next(new AppError('User not found or account is blocked', 403, true, 'ACCOUNT_RESTRICTED'));
            }

            // Check if borrower already has an active or pending loan
            const { data: activeLoan } = await supabase
                .from('loans')
                .select('id, status')
                .eq('user_id', userId)
                .in('status', ['pending', 'approved', 'disbursed'])
                .maybeSingle();

            if (activeLoan) {
                return next(new AppError(`Cannot apply. You have an active loan (${activeLoan.status}) in progress.`, 400, true, 'ACTIVE_LOAN_EXISTS'));
            }

            if (amount > user.tier_max_amount) {
                return next(new AppError(`Amount exceeds Tier ${user.current_tier} limit of $${user.tier_max_amount}`, 400, true, 'LIMIT_EXCEEDED'));
            }

            // Insert loan application
            const { data: loan, error: insertError } = await supabase
                .from('loans')
                .insert([{
                    user_id: userId,
                    amount_requested: amount,
                    tenor_months,
                    purpose,
                    status: 'pending',
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            return res.status(201).json({
                success: true,
                message: 'Loan application submitted successfully.',
                data: loan
            });
        } catch (err) {
            next(err);
        }
    }

    // 4. Accept Loan Offer
    static async acceptOffer(req, res, next) {
        try {
            const userId = req.user.id;
            const { loan_id } = req.body;

            const { data: loan, error: loanErr } = await supabase
                .from('loans')
                .select('*')
                .eq('id', loan_id)
                .eq('user_id', userId)
                .single();

            if (loanErr || !loan) {
                return next(new AppError('Loan application not found', 404, true, 'LOAN_NOT_FOUND'));
            }

            if (loan.status !== 'approved') {
                return next(new AppError('Loan offer is not in an approved state for acceptance', 400, true, 'INVALID_LOAN_STATE'));
            }

            // Update status to accepted and ready for disbursement
            const { data: updatedLoan, error: updateErr } = await supabase
                .from('loans')
                .update({ status: 'accepted', accepted_at: new Date().toISOString() })
                .eq('id', loan_id)
                .select()
                .single();

            if (updateErr) throw updateErr;

            return res.status(200).json({
                success: true,
                message: 'Loan offer accepted successfully. Processing disbursement.',
                data: updatedLoan
            });
        } catch (err) {
            next(err);
        }
    }

    // 5. Update Bank Account for Loan Payouts
    static async updateBankAccount(req, res, next) {
        try {
            const userId = req.user.id;
            const { bank_name, account_number, account_name, bank_code } = req.body;

            if (!bank_name || !account_number || !account_name) {
                return next(new AppError('Bank name, account number, and account name are required', 400, true, 'MISSING_FIELDS'));
            }

            const { data: user, error } = await supabase
                .from('users')
                .update({
                    bank_name,
                    account_number,
                    account_name,
                    bank_code: bank_code || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .select('id, bank_name, account_number, account_name')
                .single();

            if (error) throw error;

            return res.status(200).json({
                success: true,
                message: 'Disbursement bank details updated successfully.',
                data: user
            });
        } catch (err) {
            next(err);
        }
    }

    // 6. Get Borrower Mobile Dashboard Summary
    static async getDashboard(req, res, next) {
        try {
            const userId = req.params.userId || req.user.id;

            if (req.user.id !== userId && req.user.role === 'borrower') {
                return next(new AppError('Unauthorized access to dashboard data', 403, true, 'FORBIDDEN'));
            }

            // 1. Fetch user profile and limits
            const { data: profile } = await supabase
                .from('users')
                .select('id, email, phone_number, current_tier, tier_max_amount, bank_name, account_number, created_at')
                .eq('id', userId)
                .single();

            // 2. Fetch latest credit score
            const { data: creditScore } = await supabase
                .from('credit_scores')
                .select('score, eligible, max_limit, risk_tier')
                .eq('user_id', userId)
                .maybeSingle();

            // 3. Fetch active loan (if any)
            const { data: activeLoan } = await supabase
                .from('loans')
                .select('*, repayments(*)')
                .eq('user_id', userId)
                .in('status', ['pending', 'approved', 'disbursed'])
                .order('created_at', { ascending: false })
                .maybeSingle();

            // 4. Fetch linked open banking status
            const { data: linkedAccount } = await supabase
                .from('linked_bank_accounts')
                .select('status, provider, updated_at')
                .eq('user_id', userId)
                .eq('status', 'linked')
                .maybeSingle();

            return res.status(200).json({
                success: true,
                data: {
                    profile,
                    creditScore: creditScore || null,
                    activeLoan: activeLoan || null,
                    bankAccountLinked: !!linkedAccount
                }
            });
        } catch (err) {
            next(err);
        }
    }

    // 7. Get Complete Loan History
    static async getLoanHistory(req, res, next) {
        try {
            const userId = req.user.id;

            const { data: loans, error } = await supabase
                .from('loans')
                .select('*, repayments(*)')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return res.status(200).json({
                success: true,
                data: loans || []
            });
        } catch (err) {
            next(err);
        }
    }
}