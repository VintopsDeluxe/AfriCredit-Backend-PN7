// src/routes/adminRoutes.js
import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middlewares/auth.js';
import { AdminController } from '../controllers/adminController.js';

const router = Router();

// Protect all admin routes with JWT auth
router.use(authenticate);

/**
 * @openapi
 * /admin/queue:
 *   get:
 *     summary: Fetch loan applications pending risk review
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Review queue retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/queue', authorizeRoles('risk_officer', 'admin'), AdminController.getReviewQueue);

/**
 * @openapi
 * /admin/review:
 *   post:
 *     summary: Record underwriting decision (approve/reject)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - loanId
 *               - decision
 *             properties:
 *               loanId:
 *                 type: string
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               decision:
 *                 type: string
 *                 enum: [approve, reject]
 *               notes:
 *                 type: string
 *                 example: "Verified bank statements and employment history."
 *     responses:
 *       200:
 *         description: Review decision recorded successfully
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Loan not found
 */
router.post('/review', authorizeRoles('risk_officer', 'admin'), AdminController.reviewDecision);

/**
 * @openapi
 * /admin/escalate:
 *   post:
 *     summary: Escalate a review case to senior risk officers
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - loanId
 *               - reason
 *             properties:
 *               loanId:
 *                 type: string
 *               reason:
 *                 type: string
 *                 example: "High debt-to-income ratio requires manual sign-off."
 *     responses:
 *       200:
 *         description: Case escalated successfully
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Loan not found
 */
router.post('/escalate', authorizeRoles('risk_officer', 'admin'), AdminController.escalateCase);

/**
 * @openapi
 * /admin/override:
 *   post:
 *     summary: Admin override on loan underwriting decisions
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - loanId
 *               - newStatus
 *               - reason
 *             properties:
 *               loanId:
 *                 type: string
 *               newStatus:
 *                 type: string
 *               reason:
 *                 type: string
 *                 example: "Overridden due to verified collateral assets."
 *     responses:
 *       200:
 *         description: Decision overridden successfully
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Loan not found
 */
router.post('/override', authorizeRoles('admin'), AdminController.overrideDecision);

/**
 * @openapi
 * /admin/analytics:
 *   get:
 *     summary: Fetch portfolio risk and analytics summary
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Portfolio analytics retrieved successfully
 */
router.get('/analytics', authorizeRoles('finance', 'admin'), AdminController.getPortfolioAnalytics);

/**
 * @openapi
 * /admin/applications/pending:
 *   get:
 *     summary: Fetch pending loan applications
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending loan applications retrieved successfully
 */
router.get('/applications/pending', authorizeRoles('risk_officer', 'admin'), AdminController.getPendingApplications);

/**
 * @openapi
 * /admin/applications/approved:
 *   get:
 *     summary: Fetch approved loan applications
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Approved loan applications retrieved successfully
 */
router.get('/applications/approved', authorizeRoles('risk_officer', 'admin'), AdminController.getApprovedApplications);

/**
 * @openapi
 * /admin/borrowers:
 *   get:
 *     summary: Fetch all platform borrowers
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform borrowers list retrieved successfully
 */
router.get('/borrowers', authorizeRoles('risk_officer', 'admin'), AdminController.getBorrowers);

/**
 * @openapi
 * /admin/disbursements/totals:
 *   get:
 *     summary: Fetch disbursement totals summary
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Disbursement totals summary retrieved successfully
 */
router.get('/disbursements/totals', authorizeRoles('finance', 'admin'), AdminController.getDisbursementTotals);

/**
 * @openapi
 * /admin/repayments/statistics:
 *   get:
 *     summary: Fetch repayment statistics summary
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Repayment statistics summary retrieved successfully
 */
router.get('/repayments/statistics', authorizeRoles('finance', 'admin'), AdminController.getRepaymentStatistics);

/**
 * @openapi
 * /admin/loans/overdue:
 *   get:
 *     summary: Fetch overdue loans
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overdue loans list retrieved successfully
 */
router.get('/loans/overdue', authorizeRoles('risk_officer', 'admin'), AdminController.getOverdueLoans);

/**
 * @openapi
 * /admin/risk-flags:
 *   get:
 *     summary: Fetch risk flags
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Risk flags retrieved successfully
 */
router.get('/risk-flags', authorizeRoles('risk_officer', 'admin'), AdminController.getRiskFlags);

export default router;