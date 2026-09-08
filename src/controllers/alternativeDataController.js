// src/controllers/alternativeDataController.js
import { AlternativeDataService } from '../services/alternativeDataService.js';
import supabase from '../utils/supabaseClient.js';
import { AppError } from '../utils/AppError.js';

export class AlternativeDataController {

    // 1. Link Bank Account via Open Banking Widget (e.g. Mono / Okra)
    static async linkAccount(req, res, next) {
        try {
            const { code } = req.body; // Authorization code from frontend open banking widget
            const userId = req.user.id;

            if (!code) {
                return next(new AppError('Authorization code is required', 400, true, 'MISSING_CODE'));
            }

            // Exchange widget code for an account ID from the provider
            const authData = await AlternativeDataService.exchangeToken(code);
            const accountId = authData.id || authData.account?._id;

            if (!accountId) {
                return next(new AppError('Invalid account authorization data from provider', 400, true, 'INVALID_AUTH_DATA'));
            }

            // Save the linked account reference to Supabase
            const { data: linkedAccount, error: dbError } = await supabase
                .from('linked_bank_accounts')
                .upsert({
                    user_id: userId,
                    account_id: accountId,
                    provider: 'mono',
                    status: 'linked',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'account_id' })
                .select()
                .single();

            if (dbError) throw dbError;

            return res.status(200).json({
                success: true,
                message: 'Bank account successfully linked for alternative credit scoring.',
                data: { accountId, linkedAccount }
            });

        } catch (err) {
            next(err);
        }
    }

    // 2. Get All Linked Accounts for Borrower
    static async getLinkedAccounts(req, res, next) {
        try {
            const userId = req.user.id;

            const { data: accounts, error } = await supabase
                .from('linked_bank_accounts')
                .select('*')
                .eq('user_id', userId)
                .eq('status', 'linked');

            if (error) throw error;

            return res.status(200).json({
                success: true,
                data: accounts
            });
        } catch (err) {
            next(err);
        }
    }

    // 3. Compute & Cache Cash Flow Insights for Credit Scoring
    static async getCreditDataInsights(req, res, next) {
        try {
            const userId = req.user.id;

            // Fetch user's active linked bank account
            const { data: linkedAccount, error: fetchError } = await supabase
                .from('linked_bank_accounts')
                .select('account_id, provider')
                .eq('user_id', userId)
                .eq('status', 'linked')
                .maybeSingle();

            if (fetchError || !linkedAccount) {
                return next(new AppError('No active linked bank account found for user', 404, true, 'NO_LINKED_ACCOUNT'));
            }

            // Pull transactions using alternative data service
            const transactionsData = await AlternativeDataService.fetchAccountTransactions(linkedAccount.account_id);
            const transactions = transactionsData.data || transactionsData.transactions || [];

            // Compute baseline cash-flow metrics
            let totalInflow = 0;
            let totalOutflow = 0;

            transactions.forEach(tx => {
                const amount = Number(tx.amount) || 0;
                if (tx.type === 'credit') totalInflow += amount;
                if (tx.type === 'debit') totalOutflow += amount;
            });

            const netCashFlow = totalInflow - totalOutflow;
            const summary = {
                totalInflow,
                totalOutflow,
                netCashFlow,
                transactionCount: transactions.length,
                averageMonthlyInflow: transactions.length > 0 ? Number((totalInflow / 3).toFixed(2)) : 0
            };

            // Cache metrics in Supabase for the CreditEngineService to read
            await supabase
                .from('alternative_data_insights')
                .upsert({
                    user_id: userId,
                    account_id: linkedAccount.account_id,
                    total_inflow: totalInflow,
                    total_outflow: totalOutflow,
                    net_cashflow: netCashFlow,
                    transaction_count: transactions.length,
                    last_synced_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            return res.status(200).json({
                success: true,
                data: {
                    accountId: linkedAccount.account_id,
                    provider: linkedAccount.provider,
                    summary
                }
            });

        } catch (err) {
            next(err);
        }
    }

    // 4. Unlink Bank Account
    static async unlinkAccount(req, res, next) {
        try {
            const userId = req.user.id;
            const { account_id } = req.body;

            if (!account_id) {
                return next(new AppError('account_id is required', 400, true, 'MISSING_ACCOUNT_ID'));
            }

            const { error } = await supabase
                .from('linked_bank_accounts')
                .update({ 
                    status: 'unlinked', 
                    updated_at: new Date().toISOString() 
                })
                .eq('user_id', userId)
                .eq('account_id', account_id);

            if (error) throw error;

            return res.status(200).json({
                success: true,
                message: 'Bank account successfully unlinked.'
            });
        } catch (err) {
            next(err);
        }
    }
}