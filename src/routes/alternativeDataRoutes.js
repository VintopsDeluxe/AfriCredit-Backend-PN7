import { Router } from 'express';
import { AlternativeDataController } from '../controllers/alternativeDataController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.post('/link-account', AlternativeDataController.linkAccount);
router.get('/linked-accounts', AlternativeDataController.getLinkedAccounts);
router.get('/insights', AlternativeDataController.getCreditDataInsights);
router.post('/unlink', AlternativeDataController.unlinkAccount);

export default router;