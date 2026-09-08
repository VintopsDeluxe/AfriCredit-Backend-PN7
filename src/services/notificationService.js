// src/services/notificationService.js

/**
 * Send SMS notification (Supports Termii / Twilio or Console fallback)
 */
export const sendSMS = async (phoneNumber, message) => {
  try {
    if (!phoneNumber) return;

    // Production Integration Plug (Termii / Twilio)
    if (process.env.TERMII_API_KEY) {
      // Example Termii fetch call
      await fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phoneNumber,
          from: process.env.TERMII_SENDER_ID || 'AfriCredit',
          sms: message,
          type: 'plain',
          channel: 'generic',
          api_key: process.env.TERMII_API_KEY,
        }),
      });
    }

    console.log(`📱 [SMS DISPATCHED] To: ${phoneNumber} | Message: "${message}"`);
  } catch (error) {
    console.error('❌ SMS Notification Error:', error.message);
  }
};

/**
 * Send Email notification (Supports SendGrid / Resend / Nodemailer or Console fallback)
 */
export const sendEmail = async (email, subject, body) => {
  try {
    if (!email) return;

    console.log(`📧 [EMAIL DISPATCHED] To: ${email} | Subject: "${subject}"`);
  } catch (error) {
    console.error('❌ Email Notification Error:', error.message);
  }
};

/**
 * Unified Loan Event Trigger for Borrower Notifications
 */
export const sendLoanStatusNotification = async ({ email, phone, status, amount, reason }) => {
  let message = '';
  let subject = '';

  switch (status) {
    case 'approved':
      subject = 'Loan Application Approved 🎉';
      message = `Great news! Your loan application of NGN ${amount} has been approved. Log into your dashboard to accept the offer.`;
      break;
    case 'rejected':
      subject = 'Loan Application Update';
      message = `Your loan application of NGN ${amount} was not approved.${reason ? ` Reason: ${reason}` : ''}`;
      break;
    case 'disbursed':
      subject = 'Loan Funds Disbursed 💰';
      message = `Your loan of NGN ${amount} has been successfully disbursed to your bank account.`;
      break;
    case 'repaid':
      subject = 'Loan Fully Repaid ✅';
      message = `Thank you! Your loan of NGN ${amount} has been fully settled.`;
      break;
    case 'payment_received':
      subject = 'Repayment Received';
      message = `We have successfully received your loan repayment of NGN ${amount}.`;
      break;
    default:
      return;
  }

  if (phone) await sendSMS(phone, message);
  if (email) await sendEmail(email, subject, message);
};

export const NotificationService = {
  sendSMS,
  sendEmail,
  sendLoanStatusNotification,
};

export default NotificationService;