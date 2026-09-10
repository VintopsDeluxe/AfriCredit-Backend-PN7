// src/services/notificationService.js
import nodemailer from 'nodemailer';

// Configure Mailtrap transporter for email notifications
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: process.env.SMTP_PORT || 2525,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Send SMS notification using Twilio (with Termii and Console fallback options)
 */
export const sendSMS = async (phoneNumber, message) => {
  try {
    if (!phoneNumber) return;

    // Twilio Integration via Fetch
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phoneNumber,
          From: process.env.TWILIO_PHONE_NUMBER,
          Body: message,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to send SMS via Twilio');
      }

      console.log(`📱 [TWILIO SMS DISPATCHED] To: ${phoneNumber}`);
      return;
    }

    // Fallback to Termii if configured
    if (process.env.TERMII_API_KEY) {
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
      console.log(`📱 [TERMII SMS DISPATCHED] To: ${phoneNumber}`);
      return;
    }

    console.log(`📱 [SMS CONSOLE FALLBACK] To: ${phoneNumber} | Message: "${message}"`);
  } catch (error) {
    console.error('❌ SMS Notification Error:', error.message);
    console.log(`👉 [DEV Fallback OTP] Message for ${phoneNumber}: "${message}"`);
  }
};

/**
 * Send Email notification using Mailtrap / Nodemailer
 */
export const sendEmail = async (email, subject, body) => {
  try {
    if (!email) return;

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"AfriCredit Platform" <noreply@africredit.com>',
      to: email,
      subject,
      text: body,
      html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;"><p>${body.replace(/\n/g, '<br/>')}</p></div>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 [EMAIL DISPATCHED] To: ${email} | MessageId: ${info.messageId}`);
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