import { Router } from 'express';
import { BorrowerController } from '../controllers/borrowerController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate); // Protect all borrower routes

router.post('/verify-kyc', BorrowerController.verifyKYC);
router.post('/consent', BorrowerController.recordConsent);
router.post('/apply', BorrowerController.applyForLoan);
router.post('/accept-offer', BorrowerController.acceptOffer);
router.put('/bank-account', BorrowerController.updateBankAccount);
router.get('/dashboard/:userId?', BorrowerController.getDashboard);
router.get('/loans', BorrowerController.getLoanHistory);

export default router;