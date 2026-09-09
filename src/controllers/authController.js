// src/controllers/authController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from '../utils/supabaseClient.js';
import { NotificationService } from '../services/notificationService.js';
import { AppError } from '../utils/AppError.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';

export class AuthController {

    // 1. Register User with Phone Number
    static async register(req, res, next) {
        try {
            const { phone_number, password, role } = req.body;
            if (!phone_number || !password) return next(new AppError('Phone number and password required', 400, true, 'MISSING_FIELDS'));

            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('phone_number', phone_number)
                .maybeSingle();

            if (existingUser) return next(new AppError('Phone number already in use.', 400, true, 'PHONE_TAKEN'));

            const hashedPassword = await bcrypt.hash(password, 10);
            const { data: newUser, error } = await supabase
                .from('users')
                .insert([{ phone_number, password_hash: hashedPassword, role: role || 'borrower', created_at: new Date().toISOString() }])
                .select('id, phone_number, role')
                .single();

            if (error) throw error;

            return res.status(201).json({
                success: true,
                message: 'User registered successfully.',
                data: newUser
            });
        } catch (err) {
            next(err);
        }
    }

    // 2. Login User with Phone Number
    static async login(req, res, next) {
        try {
            const { phone_number, password } = req.body;
            if (!phone_number || !password) return next(new AppError('Phone number and password required', 400, true, 'MISSING_FIELDS'));

            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('phone_number', phone_number)
                .maybeSingle();

            if (error || !user) return next(new AppError('Invalid phone number or password.', 401, true, 'INVALID_CREDENTIALS'));

            const isValid = await bcrypt.compare(password, user.password_hash);
            if (!isValid) return next(new AppError('Invalid phone number or password.', 401, true, 'INVALID_CREDENTIALS'));

            const token = jwt.sign(
                { id: user.id, phone_number: user.phone_number, role: user.role },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.status(200).json({
                success: true,
                message: 'Login successful.',
                data: { token, user: { id: user.id, phone_number: user.phone_number, role: user.role } }
            });
        } catch (err) {
            next(err);
        }
    }

    // 3. Forgot Password (Generate & Send OTP via SMS)
    static async forgotPassword(req, res, next) {
        try {
            const { phone_number } = req.body;
            if (!phone_number) return next(new AppError('Phone number is required', 400, true, 'MISSING_PHONE'));

            const { data: user } = await supabase
                .from('users')
                .select('id')
                .eq('phone_number', phone_number)
                .maybeSingle();

            if (!user) return res.status(200).json({ success: true, message: 'If the phone number exists, an OTP has been sent.' });

            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

            await supabase
                .from('password_resets')
                .upsert({ user_id: user.id, otp, expires_at: expiresAt }, { onConflict: 'user_id' });

            NotificationService.sendSMS(
                phone_number,
                `Your AfriCredit password reset code is: ${otp}. Valid for 15 minutes.`
            ).catch(err => console.error('Reset SMS failed:', err));

            return res.status(200).json({ success: true, message: 'Password reset OTP sent to registered phone number.' });
        } catch (err) {
            next(err);
        }
    }

    // 4. Verify OTP Code via Phone Number
    static async verifyOtp(req, res, next) {
        try {
            const { phone_number, otp } = req.body;
            if (!phone_number || !otp) return next(new AppError('Phone number and OTP required', 400, true, 'MISSING_FIELDS'));

            const { data: user } = await supabase.from('users').select('id').eq('phone_number', phone_number).maybeSingle();
            if (!user) return next(new AppError('Invalid request.', 400, true, 'INVALID_USER'));

            const { data: resetRecord } = await supabase
                .from('password_resets')
                .select('*')
                .eq('user_id', user.id)
                .eq('otp', otp)
                .maybeSingle();

            if (!resetRecord || new Date(resetRecord.expires_at) < new Date()) {
                return next(new AppError('Invalid or expired OTP code.', 400, true, 'INVALID_OTP'));
            }

            return res.status(200).json({ success: true, message: 'OTP successfully verified.' });
        } catch (err) {
            next(err);
        }
    }

    // 5. Reset Password (Complete Reset via Phone Number)
    static async resetPassword(req, res, next) {
        try {
            const { phone_number, otp, newPassword } = req.body;
            if (!phone_number || !otp || !newPassword) return next(new AppError('Phone number, OTP, and new password are required', 400, true, 'MISSING_FIELDS'));

            const { data: user } = await supabase.from('users').select('id').eq('phone_number', phone_number).maybeSingle();
            if (!user) return next(new AppError('Invalid request.', 400, true, 'INVALID_USER'));

            const { data: resetRecord } = await supabase
                .from('password_resets')
                .select('*')
                .eq('user_id', user.id)
                .eq('otp', otp)
                .maybeSingle();

            if (!resetRecord || new Date(resetRecord.expires_at) < new Date()) {
                return next(new AppError('Invalid or expired OTP code.', 400, true, 'INVALID_OTP'));
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await supabase.from('users').update({ password_hash: hashedPassword }).eq('id', user.id);
            await supabase.from('password_resets').delete().eq('user_id', user.id);

            return res.status(200).json({ success: true, message: 'Password successfully reset.' });
        } catch (err) {
            next(err);
        }
    }

    // 6. Google OAuth Redirect
    static async googleAuthRedirect(req, res, next) {
        try {
            return res.status(302).json({
                success: true,
                message: 'OAuth redirection endpoint.',
                redirectUrl: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID...'
            });
        } catch (err) {
            next(err);
        }
    }
}