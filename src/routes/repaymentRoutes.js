import { Router } from 'express';
import { RepaymentController } from '../controllers/repaymentController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

/**
 * @openapi
 * /repayments/webhook:
 *   post:
 *     summary: Handle Paystack payment webhook events
 *     tags:
 *       - Repayments
 *     security: []
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
// 1. Keep webhook public (no JWT auth required) and point to the controller method
router.post('/webhook', RepaymentController.handlePaystackWebhook);

// 2. Protect all subsequent repayment endpoints with authentication
router.use(authenticate);

/**
 * @openapi
 * /repayments/initiate:
 *   post:
 *     summary: Initiate a loan repayment transaction
 *     tags:
 *       - Repayments
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
 *               - amount
 *             properties:
 *               loanId:
 *                 type: string
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *                 description: Unique UUID of the loan being repaid
 *               amount:
 *                 type: number
 *                 example: 15000
 *                 description: Amount to repay in NGN
 *     responses:
 *       200:
 *         description: Payment transaction initialized successfully with Paystack authorization URL
 *       400:
 *         description: Missing loan ID or amount
 *       401:
 *         description: Unauthorized
 */
router.post('/initiate', RepaymentController.initiateRepayment);

/**
 * @openapi
 * /repayments/history:
 *   get:
 *     summary: Fetch repayment history for the authenticated user
 *     tags:
 *       - Repayments
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user repayments retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/history', RepaymentController.getRepaymentHistory);

/**
 * @openapi
 * /repayments/schedule/{loanId}:
 *   get:
 *     summary: Fetch repayment schedule for a specific loan
 *     tags:
 *       - Repayments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loanId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique UUID of the loan
 *     responses:
 *       200:
 *         description: Repayment schedule retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Loan schedule not found
 */
router.get('/schedule/:loanId', RepaymentController.getRepaymentSchedule);

export default router;