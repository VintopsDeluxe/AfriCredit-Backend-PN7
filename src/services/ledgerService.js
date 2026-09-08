// src/services/ledgerService.js
import supabase from '../utils/supabaseClient.js';
import { AppError } from '../utils/AppError.js';

export class LedgerService {
    /**
     * Records an immutable transaction and handles optimistic locking version checks.
     * @param {Object} transactionData 
     */
    static async recordTransaction(transactionData) {
        const { loan_id, user_id, amount, type, idempotency_key } = transactionData;

        try {
            // 1. Check idempotency at the ledger level
            if (idempotency_key) {
                const { data: existingTx } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('idempotency_key', idempotency_key)
                    .single();

                if (existingTx) {
                    return { success: true, duplicate: true, transaction: existingTx };
                }
            }

            // 2. Perform optimistic lock verification if loan_id is provided
            if (loan_id) {
                const { data: loan, error: loanErr } = await supabase
                    .from('loans')
                    .select('version, status')
                    .eq('id', loan_id)
                    .single();

                if (loanErr || !loan) throw new AppError('Loan not found for ledger entry', 404);

                // Increment version to enforce optimistic locking constraint
                const { error: updateErr } = await supabase
                    .from('loans')
                    .update({ version: loan.version + 1 })
                    .eq('id', loan_id)
                    .eq('version', loan.version); // Ensures no concurrent update happened

                if (updateErr) {
                    throw new AppError('Concurrent modification detected. Please retry.', 409, true, 'CONCURRENCY_CONFLICT');
                }
            }

            // 3. Insert immutable transaction row
            const { data: newTx, error: txError } = await supabase
                .from('transactions')
                .insert([
                    {
                        loan_id,
                        user_id,
                        amount,
                        type, // e.g., 'disbursement', 'repayment'
                        idempotency_key,
                        status: 'completed'
                    }
                ])
                .select()
                .single();

            if (txError) throw txError;

            return { success: true, duplicate: false, transaction: newTx };
        } catch (err) {
            throw err instanceof AppError ? err : new AppError(err.message, 500, true, 'LEDGER_TRANSACTION_FAILED');
        }
    }
}