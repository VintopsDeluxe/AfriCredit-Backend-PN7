// src/controllers/creditController.js
import { CreditEngineService } from '../services/creditEngineService.js';
import supabase from '../utils/supabaseClient.js';
import { AppError } from '../utils/AppError.js';

export class CreditController {

    // 1. Live Run Creditworthiness Evaluation
    static async evaluateCredit(req, res, next) {
        try {
            const userId = req.user.id;

            // Run evaluation rules via CreditEngineService
            const evaluationResult = await CreditEngineService.evaluateUserCredit(userId);

            // Persist credit score results in Supabase
            const { error: dbError } = await supabase
                .from('credit_scores')
                .upsert({
                    user_id: userId,
                    score: evaluationResult.score,
                    eligible: evaluationResult.eligible,
                    max_limit: evaluationResult.maxEligibleAmount,
                    risk_tier: evaluationResult.riskTier || 'MEDIUM',
                    evaluated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (dbError) {
                console.error('Failed to save credit score:', dbError.message);
            }

            return res.status(200).json({
                success: true,
                data: evaluationResult
            });

        } catch (err) {
            next(err);
        }
    }

    // 2. Fetch Borrower Credit Profile (For Mobile App / Borrower Dashboard)
    static async getCreditProfile(req, res, next) {
        try {
            const userId = req.user.id;

            const { data: creditData, error } = await supabase
                .from('credit_scores')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (error) throw error;

            if (!creditData) {
                return next(new AppError('Credit score not evaluated yet', 404, true, 'NOT_EVALUATED'));
            }

            return res.status(200).json({
                success: true,
                data: creditData
            });
        } catch (err) {
            next(err);
        }
    }

    // 3. Get Risk Dashboard Metrics (For Week 6 Admin Portal)
    static async getRiskMetrics(req, res, next) {
        try {
            const { data: scores, error } = await supabase
                .from('credit_scores')
                .select('score, eligible, max_limit, risk_tier');

            if (error) throw error;

            const totalEvaluated = scores.length;
            const eligibleCount = scores.filter(s => s.eligible).length;
            const averageScore = totalEvaluated > 0 
                ? Math.round(scores.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalEvaluated) 
                : 0;

            const riskTiers = {
                LOW: scores.filter(s => s.risk_tier === 'LOW').length,
                MEDIUM: scores.filter(s => s.risk_tier === 'MEDIUM').length,
                HIGH: scores.filter(s => s.risk_tier === 'HIGH').length,
            };

            return res.status(200).json({
                success: true,
                data: {
                    total_evaluated_users: totalEvaluated,
                    eligible_users_count: eligibleCount,
                    average_credit_score: averageScore,
                    risk_tier_distribution: riskTiers
                }
            });
        } catch (err) {
            next(err);
        }
    }
}