// src/routes/kycRoutes.js
import { Router } from 'express';
import { KYCController } from '../controllers/kycController.js';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';

const router = Router();

// Protect all KYC endpoints with JWT authentication
router.use(authenticate);

/**
 * @openapi
 * /kyc/submit:
 *   post:
 *     summary: Submit KYC verification details
 *     tags:
 *       - KYC
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bvn
 *               - idType
 *               - idNumber
 *             properties:
 *               bvn:
 *                 type: string
 *                 example: "22123456789"
 *                 description: 11-digit Bank Verification Number
 *               idType:
 *                 type: string
 *                 enum: [nin, passport, drivers_license, voters_card]
 *                 example: nin
 *                 description: Type of identification document
 *               idNumber:
 *                 type: string
 *                 example: "12345678901"
 *                 description: ID card or document identification number
 *               documentUrl:
 *                 type: string
 *                 example: "https://storage.africredit.com/docs/nin_123.jpg"
 *                 description: URL to uploaded document image/file
 *     responses:
 *       200:
 *         description: KYC submission received successfully
 *       400:
 *         description: Missing or invalid KYC details
 *       401:
 *         description: Unauthorized
 */
router.post('/submit', KYCController.submitKYC);

/**
 * @openapi
 * /kyc/status:
 *   get:
 *     summary: Fetch current KYC verification status for authenticated user
 *     tags:
 *       - KYC
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KYC status retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/status', KYCController.getKYCStatus);

/**
 * @openapi
 * /kyc/review:
 *   post:
 *     summary: Review and approve or reject a user's KYC submission (Admin Only)
 *     tags:
 *       - KYC
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - status
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *                 description: ID of the user whose KYC is being reviewed
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *                 example: approved
 *                 description: Decision status
 *               rejectionReason:
 *                 type: string
 *                 example: "Document image is unreadable"
 *                 description: Required if status is rejected
 *     responses:
 *       200:
 *         description: KYC review recorded successfully
 *       400:
 *         description: Invalid payload or decision status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post('/review', authorizeAdmin, KYCController.reviewKYC);

export default router;