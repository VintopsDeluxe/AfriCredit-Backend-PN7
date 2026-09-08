// src/routes/index.js
import { Router } from 'express';
import authRoutes from './authRoutes.js';
import borrowerRoutes from './borrowerRoutes.js';
import adminRoutes from './adminRoutes.js';
import loanRoutes from './loanRoutes.js';
import repaymentRoutes from './repaymentRoutes.js';
import webhookRoutes from './webhookRoutes.js';
import kycRoutes from './kycRoutes.js';
import creditRoutes from './creditRoutes.js';
import alternativeDataRoutes from './alternativeDataRoutes.js';

const router = Router();

/**
 * @openapi
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: Enter your JWT token to authorize requests. Example: "Bearer eyJhbGciOi..."
 *
 * tags:
 *   - name: Authentication
 *     description: User registration, login, OTP verification, and OAuth routes
 *   - name: Loans
 *     description: Loan applications, status updates, and history tracking
 *   - name: Repayments
 *     description: Loan repayment workflows and payment schedules
 *   - name: Admin
 *     description: Risk review queue, underwriting decisions, overrides, and analytics
 *   - name: Borrower
 *     description: Borrower profile management and dashboard info
 *   - name: KYC
 *     description: Identity verification and document checks
 *   - name: Credit
 *     description: Credit scoring and bureau integrations
 *   - name: Alternative Data
 *     description: Non-traditional credit scoring data sources
 *   - name: Webhooks
 *     description: Event listeners for Paystack and external services
 */

// Core Route Mounts
router.use('/auth', authRoutes);
router.use('/borrower', borrowerRoutes);
router.use('/admin', adminRoutes);
router.use('/loans', loanRoutes);
router.use('/repayments', repaymentRoutes);
router.use('/webhooks', webhookRoutes);

// Risk, Identity & Open Banking Mounts
router.use('/kyc', kycRoutes);
router.use('/credit', creditRoutes);
router.use('/alternative-data', alternativeDataRoutes);

export default router;