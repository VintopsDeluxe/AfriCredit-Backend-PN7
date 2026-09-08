// src/routes/adminRoutes.js
import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middlewares/auth.js';
import { AdminController } from '../controllers/adminController.js';

const router = Router();

// Protect all admin routes with JWT auth
router.use(authenticate);

router.get('/queue', authorizeRoles('risk_officer', 'admin'), AdminController.getReviewQueue);
router.post('/review', authorizeRoles('risk_officer', 'admin'), AdminController.reviewDecision);
router.post('/escalate', authorizeRoles('risk_officer', 'admin'), AdminController.escalateCase);
router.post('/override', authorizeRoles('admin'), AdminController.overrideDecision);
router.get('/analytics', authorizeRoles('finance', 'admin'), AdminController.getPortfolioAnalytics);

export default router;