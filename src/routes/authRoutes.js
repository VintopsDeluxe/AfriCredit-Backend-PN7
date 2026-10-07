// src/routes/authRoutes.js
import express from 'express';
import { AuthController } from '../controllers/authController.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Initiate user registration by requesting an OTP sent to phone number
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone_number
 *             properties:
 *               phone_number:
 *                 type: string
 *                 example: "+2348012345678"
 *               role:
 *                 type: string
 *                 enum: [borrower, risk_officer, admin]
 *                 example: "borrower"
 *     responses:
 *       200:
 *         description: Verification OTP sent to phone number
 *       400:
 *         description: Phone number already in use or missing fields
 *       429:
 *         description: Too many requests, rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post(
    '/register', 
    rateLimiter({ max: 20, message: 'Too many registration attempts. Please try again later.' }), 
    AuthController.register
);

/**
 * @swagger
 * /auth/verify-registration:
 *   post:
 *     summary: Complete user registration by verifying OTP and setting account password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone_number
 *               - otp
 *               - password
 *             properties:
 *               phone_number:
 *                 type: string
 *                 example: "+2348012345678"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *               password:
 *                 type: string
 *                 example: "SecurePass123!"
 *     responses:
 *       201:
 *         description: Account successfully registered and verified
 *       400:
 *         description: Invalid or expired OTP code, or missing required fields
 *       429:
 *         description: Too many requests, rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post(
    '/verify-registration',
    rateLimiter({ max: 10, message: 'Too many registration verification attempts. Please try again later.' }),
    AuthController.verifyRegistration
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate user via phone number and return a JWT bearer token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone_number
 *               - password
 *             properties:
 *               phone_number:
 *                 type: string
 *                 example: "+2348012345678"
 *               password:
 *                 type: string
 *                 example: "SecurePass123!"
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid phone number or password
 *       429:
 *         description: Too many requests, rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post(
    '/login', 
    rateLimiter({ max: 10, message: 'Too many login attempts. Please try again later.' }), 
    AuthController.login
);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Trigger password reset OTP generation and SMS dispatch
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone_number
 *             properties:
 *               phone_number:
 *                 type: string
 *                 example: "+2348012345678"
 *     responses:
 *       200:
 *         description: Password reset OTP sent to registered phone number
 *       429:
 *         description: Too many requests, rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post(
    '/forgot-password', 
    rateLimiter({ max: 5, message: 'Too many password reset requests. Please try again later.' }), 
    AuthController.forgotPassword
);

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Verify password reset OTP code via phone number
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone_number
 *               - otp
 *             properties:
 *               phone_number:
 *                 type: string
 *                 example: "+2348012345678"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid or expired OTP code
 *       429:
 *         description: Too many requests, rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post(
    '/verify-otp', 
    rateLimiter({ max: 5, message: 'Too many OTP verification attempts. Please try again later.' }), 
    AuthController.verifyOtp
);

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Redirect user to Google OAuth 2.0 authorization screen
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirection to third-party provider endpoint
 *       429:
 *         description: Too many requests, rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.get(
    '/google', 
    rateLimiter({ max: 30 }), 
    AuthController.googleAuthRedirect
);

export default router;