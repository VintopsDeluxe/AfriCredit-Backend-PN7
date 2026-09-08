import { supabase } from '../config/supabase.js';

export class RepaymentService {
  static async initiateRepayment(userId, loanId, amount) {
    const { data: loan, error: loanErr } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .eq('user_id', userId)
      .single();

    if (loanErr || !loan) throw new Error('Target loan record not found');

    const paymentRef = `PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: repayment, error } = await supabase
      .from('repayments')
      .insert([
        {
          loan_id: loanId,
          user_id: userId,
          amount,
          status: 'COMPLETED',
          payment_reference: paymentRef
        }
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return repayment;
  }

  static async getHistory(userId) {
    const { data, error } = await supabase
      .from('repayments')
      .select('*')
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return data;
  }
}