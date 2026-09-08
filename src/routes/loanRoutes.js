// src/routes/loanRoutes.js
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { idempotency } from '../middlewares/idempotency.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';
import { LoanController } from '../controllers/loanController.js';

const router = Router();

// Protect all loan routes with JWT authentication
router.use(authenticate);

// Apply general rate limiter to all loan routes
router.use(rateLimiter());

/**
 * @openapi
 * /loans/apply:
 *   post:
 *     summary: Apply for a new loan
 *     tags:
 *       - Loans
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional unique key to prevent duplicate application submissions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - tenureMonths
 *               - payoutDestinationAccount
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 50000
 *                 description: Loan amount requested
 *               tenureMonths:
 *                 type: integer
 *                 example: 6
 *                 description: Loan duration in months
 *               purpose:
 *                 type: string
 *                 example: Business Expansion
 *                 description: Optional reason for the loan
 *               bvn:
 *                 type: string
 *                 example: "22123456789"
 *                 description: Bank Verification Number for fraud evaluation
 *               payoutDestinationAccount:
 *                 type: string
 *                 example: "0123456789"
 *                 description: Account number for loan disbursement
 *               payoutDestinationType:
 *                 type: string
 *                 example: "bank_account"
 *                 description: Type of payout destination (default is bank_account)
 *     responses:
 *       201:
 *         description: Loan application submitted successfully
 *       400:
 *         description: Invalid input, fraud engine flag, or user already has an active loan
 *       401:
 *         description: Unauthorized - Token missing or invalid
 *       429:
 *         description: Too many requests, rate limit exceeded
 */
router.post(
    '/apply', 
    rateLimiter({ max: 10, message: 'Too many loan application requests. Please try again later.' }), 
    idempotency(), 
    LoanController.applyForLoan
);

/**
 * @openapi
 * /loans/accept:
 *   post:
 *     summary: Accept an approved loan offer
 *     tags:
 *       - Loans
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional unique key to prevent duplicate request processing
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - loanId
 *             properties:
 *               loanId:
 *                 type: string
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *                 description: ID of the approved loan to accept
 *     responses:
 *       200:
 *         description: Loan offer accepted successfully
 *       400:
 *         description: Loan offer not found or not eligible for acceptance
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests, rate limit exceeded
 */
router.post('/accept', idempotency(), LoanController.acceptOffer);

/**
 * @openapi
 * /loans/active:
 *   get:
 *     summary: Fetch the currently active loan for the user
 *     tags:
 *       - Loans
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active loan details retrieved
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests, rate limit exceeded
 */
router.get('/active', LoanController.getActiveLoan);

/**
 * @openapi
 * /loans/history:
 *   get:
 *     summary: Fetch full loan history for the authenticated user
 *     tags:
 *       - Loans
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user loans retrieved successfully
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests, rate limit exceeded
 */
router.get('/history', LoanController.getLoanHistory);

/**
 * @openapi
 * /loans/{id}:
 *   get:
 *     summary: Fetch details and status of a specific loan by ID
 *     tags:
 *       - Loans
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique UUID of the loan
 *     responses:
 *       200:
 *         description: Loan details retrieved successfully
 *       404:
 *         description: Loan not found
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests, rate limit exceeded
 */
router.get('/:id', LoanController.getLoanStatus);

export default router;