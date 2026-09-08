import { supabase } from '../config/supabase.js';

export class LoanService {
  static calculateAmortization(principal, annualRate, tenureMonths) {
    const monthlyRate = annualRate / 12 / 100;
    const monthlyPayment =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
      (Math.pow(1 + monthlyRate, tenureMonths) - 1);

    let remainingBalance = principal;
    const schedule = [];

    for (let month = 1; month <= tenureMonths; month++) {
      const interest = remainingBalance * monthlyRate;
      const principalPayment = monthlyPayment - interest;
      remainingBalance -= principalPayment;

      schedule.push({
        month,
        payment: Number(monthlyPayment.toFixed(2)),
        principal: Number(principalPayment.toFixed(2)),
        interest: Number(interest.toFixed(2)),
        remainingBalance: Number(Math.max(0, remainingBalance).toFixed(2))
      });
    }

    return { monthlyPayment: Number(monthlyPayment.toFixed(2)), schedule };
  }

  static async applyForLoan(userId, amount, tenureMonths, interestRate = 15) {
    const { monthlyPayment, schedule } = this.calculateAmortization(amount, interestRate, tenureMonths);

    const { data, error } = await supabase
      .from('loans')
      .insert([
        {
          user_id: userId,
          amount,
          tenure_months: tenureMonths,
          interest_rate: interestRate,
          monthly_payment: monthlyPayment,
          status: 'PENDING',
          repayment_schedule: schedule
        }
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  static async getLoansByUser(userId) {
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return data;
  }

  static async getLoanById(loanId, userId) {
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .eq('user_id', userId)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}