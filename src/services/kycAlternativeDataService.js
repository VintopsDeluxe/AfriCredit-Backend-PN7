import { supabase } from '../config/db.js';

export class KycAlternativeDataService {
  // BR-04: Capture per-source consent with timestamp
  static async recordConsent(userId, source, consentGiven) {
    const { data, error } = await supabase
      .from('user_consents')
      .insert({
        user_id: userId,
        data_source: source, // 'mobile_money' | 'utility'
        consent_given: consentGiven,
        consented_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // DI-01, DI-03, DI-05: Fetch alternative financial data with graceful outage degradation
  static async fetchFinancialData(userId, provider = 'mono') {
    const { data: consent } = await supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', userId)
      .eq('data_source', 'mobile_money')
      .eq('consent_given', true)
      .single();

    if (!consent) {
      throw new Error('Explicit consent required before pulling mobile money records.');
    }

    try {
      // Mocking Aggregator API pull (Mono / Okra)
      const rawPayload = {
        provider,
        transactions_count: 142,
        average_monthly_income: 185000,
        utility_payments_on_time_ratio: 0.92,
        account_age_months: 18,
      };

      // DI-03: Store raw retrieved data as JSONB alongside derived features
      const { data: inserted, error } = await supabase
        .from('alternative_data_logs')
        .insert({
          user_id: userId,
          provider,
          raw_data: rawPayload,
          derived_monthly_income: rawPayload.average_monthly_income,
          derived_utility_consistency: rawPayload.utility_payments_on_time_ratio,
          derived_account_tenure_months: rawPayload.account_age_months,
          retrieved_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return inserted;
    } catch (err) {
      // DI-05: Graceful degradation during aggregator outage
      console.error('Aggregator integration error:', err.message);
      return null;
    }
  }
}