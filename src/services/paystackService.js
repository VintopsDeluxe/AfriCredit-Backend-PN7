// src/services/paystackService.js

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Helper function to build headers
const getHeaders = () => ({
  Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
  'Content-Type': 'application/json',
});

/**
 * 1. Initialize a Payment (Loan Repayments / Deposits)
 */
export const initializeTransaction = async (email, amountInKobo, callbackUrl = null) => {
  try {
    const payload = { email, amount: amountInKobo };
    if (callbackUrl) payload.callback_url = callbackUrl;

    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!data.status) throw new Error(data.message || 'Payment initialization failed');

    return data;
  } catch (error) {
    console.error('Error initializing transaction:', error.message);
    throw error;
  }
};

/**
 * 2. Verify a Transaction Status
 */
export const verifyTransaction = async (reference) => {
  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    const data = await response.json();
    if (!data.status) throw new Error(data.message || 'Payment verification failed');

    return data;
  } catch (error) {
    console.error('Error verifying transaction:', error.message);
    throw error;
  }
};

/**
 * 3. Create a Transfer Recipient (Register bank account for Loan Disbursements)
 */
export const createTransferRecipient = async ({ name, accountNumber, bankCode, currency = 'NGN' }) => {
  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transferrecipient`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        type: 'nuban',
        name,
        account_number: accountNumber,
        bank_code: bankCode,
        currency,
      }),
    });

    const data = await response.json();
    if (!data.status) throw new Error(data.message || 'Failed to create transfer recipient');

    return data;
  } catch (error) {
    console.error('Error creating transfer recipient:', error.message);
    throw error;
  }
};

/**
 * 4. Initiate a Transfer (Payout / Disburse Loan to Borrower)
 */
export const disburseLoan = async ({ recipientCode, amountInKobo, reason = 'AfriCredit Loan Disbursement' }) => {
  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transfer`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        source: 'balance',
        amount: amountInKobo,
        recipient: recipientCode,
        reason,
      }),
    });

    const data = await response.json();
    if (!data.status) throw new Error(data.message || 'Loan disbursement failed');

    return data;
  } catch (error) {
    console.error('Error disbursing loan:', error.message);
    throw error;
  }
};

// Unified export object for controller access
export const PaystackService = {
  initializeTransaction,
  verifyTransaction,
  createTransferRecipient,
  disburseLoan,
};

export default PaystackService;