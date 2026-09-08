import { Router } from 'express';
import { CreditController } from '../controllers/creditController.js';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.post('/evaluate', CreditController.evaluateCredit);
router.get('/profile', CreditController.getCreditProfile);

// Admin-only risk dashboard route
router.get('/risk-metrics', authorizeAdmin, CreditController.getRiskMetrics);

export default router;