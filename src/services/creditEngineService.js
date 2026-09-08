// src/services/creditEngineService.js
import supabase from '../utils/supabaseClient.js';
import { AlternativeDataService } from './alternativeDataService.js';

export class CreditEngineService {
    static async evaluateUserCredit(userId) {
        // 1. Check KYC verification status
        const { data: kyc } = await supabase
            .from('kyc_profiles')
            .select('status')
            .eq('user_id', userId)
            .single();

        if (!kyc || kyc.status !== 'verified') {
            return {
                eligible: false,
                score: 0,
                maxEligibleAmount: 0,
                reason: 'KYC must be verified before credit scoring.'
            };
        }

        // 2. Fetch linked bank account
        const { data: linkedAccount } = await supabase
            .from('linked_bank_accounts')
            .select('account_id')
            .eq('user_id', userId)
            .single();

        if (!linkedAccount) {
            return {
                eligible: false,
                score: 300, // Base default score
                maxEligibleAmount: 0,
                reason: 'No linked bank account found for alternative scoring.'
            };
        }

        // 3. Fetch transaction history using Alternative Data Service
        let transactionsData;
        try {
            transactionsData = await AlternativeDataService.fetchAccountTransactions(linkedAccount.account_id);
        } catch (err) {
            return {
                eligible: false,
                score: 300,
                maxEligibleAmount: 0,
                reason: 'Failed to pull transaction history from alternative data provider.'
            };
        }

        const transactions = transactionsData.data || transactionsData.transactions || [];
        let totalInflow = 0;
        let totalOutflow = 0;

        transactions.forEach(tx => {
            if (tx.type === 'credit') totalInflow += tx.amount;
            if (tx.type === 'debit') totalOutflow += tx.amount;
        });

        const netCashFlow = totalInflow - totalOutflow;

        // 4. Rule-Based Scoring Logic
        let score = 400; // Base score for verified users with a bank account
        
        if (netCashFlow > 0) score += 150;
        if (transactions.length >= 15) score += 100;
        if (totalInflow >= 50000) score += 150; // Example currency volume threshold

        // 5. Determine Eligibility & Credit Limit (e.g., 30% of positive net cash flow)
        const eligible = score >= 600 && netCashFlow > 0;
        const maxEligibleAmount = eligible ? Math.floor(netCashFlow * 0.3) : 0;

        return {
            eligible,
            score,
            metrics: {
                totalInflow,
                totalOutflow,
                netCashFlow,
                transactionCount: transactions.length
            },
            maxEligibleAmount,
            reason: eligible ? 'Passed alternative credit evaluation criteria.' : 'Failed minimum cash-flow threshold or score requirement.'
        };
    }
}