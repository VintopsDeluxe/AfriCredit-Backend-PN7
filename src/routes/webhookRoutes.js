// src/controllers/webhookController.js
import crypto from 'crypto';
import { supabase } from '../config/db.js';
import { redis } from '../config/redis.js';

export class WebhookController {
    static async handlePaymentWebhook(req, res) {
        try {
            const secret = process.env.WEBHOOK_SECRET || process.env.PAYMENT_GATEWAY_SECRET_KEY;
            const paystackSignature = req.headers['x-paystack-signature'];

            // 1. Verify HMAC SHA512 Signature
            const hash = crypto
                .createHmac('sha512', secret)
                .update(JSON.stringify(req.body))
                .digest('hex');

            if (hash !== paystackSignature) {
                console.warn('⚠️ Unauthorized webhook signature attempt detected.');
                return res.status(401).json({ error: 'Invalid webhook signature' });
            }

            const event = req.body;
            const eventId = event.id || event.data?.reference;

            // 2. Prevent Replay Attacks using Redis (24-hour cache)
            if (eventId) {
                const eventExists = await redis.get(`webhook:${eventId}`);
                if (eventExists) {
                    return res.status(200).json({ received: true, message: 'Event already processed' });
                }
                await redis.set(`webhook:${eventId}`, 'processed', { EX: 86400 });
            }

            const paymentData = event.data;
            const metadata = paymentData?.metadata;

            // 3. Handle Repayments (Inbound Charges)
            if (event.event === 'charge.success') {
                const reference = paymentData.reference;
                const amountPaid = paymentData.amount / 100;

                console.log(`💰 Payment successful: ${reference}, Amount: ${amountPaid}`);

                if (metadata?.loanId) {
                    // Update repayment record
                    await supabase
                        .from('repayments')
                        .update({ 
                            status: 'completed', 
                            paid_at: new Date().toISOString(),
                            payment_reference: reference 
                        })
                        .eq('loan_id', metadata.loanId);

                    // Check if all repayments are completed to close the loan
                    const { data: pendingRepayments } = await supabase
                        .from('repayments')
                        .select('id')
                        .eq('loan_id', metadata.loanId)
                        .neq('status', 'completed');

                    if (!pendingRepayments || pendingRepayments.length === 0) {
                        await supabase
                            .from('loans')
                            .update({ status: 'repaid', updated_at: new Date().toISOString() })
                            .eq('id', metadata.loanId);
                    }
                }
            }

            // 4. Handle Outbound Disbursements (Paystack Transfers)
            if (event.event === 'transfer.success') {
                const loanId = metadata?.loanId;
                if (loanId) {
                    await supabase
                        .from('loans')
                        .update({ status: 'disbursed', disbursed_at: new Date().toISOString() })
                        .eq('id', loanId);
                }
            }

            if (event.event === 'transfer.failed') {
                const loanId = metadata?.loanId;
                if (loanId) {
                    await supabase
                        .from('loans')
                        .update({ status: 'disbursement_failed' })
                        .eq('id', loanId);
                }
            }

            return res.status(200).json({ received: true });
        } catch (err) {
            console.error('Webhook processing error:', err.message);
            return res.status(500).json({ error: 'Webhook processing failed' });
        }
    }
}

export default WebhookController;