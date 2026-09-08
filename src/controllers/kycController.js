// src/controllers/kycController.js
import supabase from '../utils/supabaseClient.js';
import { AppError } from '../utils/AppError.js';
import { EmailService } from '../services/emailService.js';

export class KYCController {

    // 1. Submit Borrower KYC Data
    static async submitKYC(req, res, next) {
        try {
            const userId = req.user.id;
            const { fullName, dateOfBirth, bvn, nin, idType, idNumber } = req.body;

            if (!fullName || (!bvn && !nin)) {
                return next(new AppError('Full name and at least BVN or NIN are required', 400, true, 'MISSING_FIELDS'));
            }

            // Check if user KYC is already verified
            const { data: existingKyc } = await supabase
                .from('kyc_profiles')
                .select('status')
                .eq('user_id', userId)
                .maybeSingle();

            if (existingKyc && existingKyc.status === 'verified') {
                return next(new AppError('User KYC is already verified.', 400, true, 'ALREADY_VERIFIED'));
            }

            // Upsert KYC profile data into Supabase
            const { data: kycData, error: dbError } = await supabase
                .from('kyc_profiles')
                .upsert({
                    user_id: userId,
                    full_name: fullName,
                    date_of_birth: dateOfBirth,
                    bvn,
                    nin,
                    id_type: idType,
                    id_number: idNumber,
                    status: 'pending',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' })
                .select()
                .single();

            if (dbError) throw dbError;

            // Fetch user email and trigger notification asynchronously
            const { data: userData } = await supabase
                .from('users')
                .select('email')
                .eq('id', userId)
                .single();

            if (userData?.email) {
                EmailService.sendKYCStatusEmail(userData.email, fullName, 'pending')
                    .catch(err => console.error('Background email failed:', err));
            }

            return res.status(200).json({
                success: true,
                message: 'KYC details submitted successfully and are pending review.',
                data: kycData
            });

        } catch (err) {
            next(err);
        }
    }

    // 2. Fetch Borrower KYC Status & Profile
    static async getKYCStatus(req, res, next) {
        try {
            const userId = req.user.id;

            const { data: kycProfile, error } = await supabase
                .from('kyc_profiles')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (error) throw error;

            if (!kycProfile) {
                return res.status(200).json({
                    success: true,
                    data: {
                        status: 'unverified',
                        message: 'No KYC submission found.'
                    }
                });
            }

            return res.status(200).json({
                success: true,
                data: kycProfile
            });
        } catch (err) {
            next(err);
        }
    }

    // 3. Admin Review & Verification (Approve / Reject & Upgrade Tier)
    static async reviewKYC(req, res, next) {
        try {
            const { user_id, status, rejection_reason } = req.body; // status: 'verified' or 'rejected'

            if (!user_id || !['verified', 'rejected'].includes(status)) {
                return next(new AppError('Valid user_id and status (verified/rejected) are required', 400, true, 'INVALID_INPUT'));
            }

            // Update KYC Status
            const { data: kycProfile, error } = await supabase
                .from('kyc_profiles')
                .update({
                    status,
                    rejection_reason: status === 'rejected' ? rejection_reason : null,
                    verified_at: status === 'verified' ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user_id)
                .select()
                .single();

            if (error) throw error;

            // Automatically upgrade user tier to Tier 1 upon KYC approval
            if (status === 'verified') {
                await supabase
                    .from('users')
                    .update({ current_tier: 'Tier 1' })
                    .eq('id', user_id);
            }

            // Notify Borrower of Decision
            const { data: userData } = await supabase
                .from('users')
                .select('email')
                .eq('id', user_id)
                .single();

            if (userData?.email) {
                EmailService.sendKYCStatusEmail(userData.email, kycProfile.full_name || 'Borrower', status)
                    .catch(err => console.error('KYC Status Email failed:', err));
            }

            return res.status(200).json({
                success: true,
                message: `KYC status successfully updated to ${status}.`,
                data: kycProfile
            });

        } catch (err) {
            next(err);
        }
    }
}