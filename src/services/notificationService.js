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
 * Send SMS notification using Robase API as primary provider,
 * with Termii, Twilio, and Console fallbacks.
 */
export const sendSMS = async (phoneNumber, message) => {
  try {
    if (!phoneNumber) return;

    // Standardize phone number in international format (+234...)
    const formattedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+${phoneNumber.replace(/^0/, '234')}`;

    // 1. Primary: Robase API (https://api.robase.dev)
    if (process.env.ROBASE_API_KEY) {
      const response = await fetch('https://api.robase.dev/v1/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ROBASE_API_KEY}`,
        },
        body: JSON.stringify({
          phone_number: formattedPhone,
          message: message,
          sender_id: process.env.ROBASE_SENDER_ID || 'Robase',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`📱 [ROBASE SMS DISPATCHED] To: ${formattedPhone} | ID: ${data.id || data.message_id || 'N/A'}`);
        return data;
      }

      console.warn('⚠️ [Robase Provider Warning]:', data);
    }

    // 2. Secondary Fallback: Termii Integration
    if (process.env.TERMII_API_KEY) {
      const termiiPhone = formattedPhone.startsWith('+') ? formattedPhone.slice(1) : formattedPhone;

      const response = await fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: termiiPhone,
          from: process.env.TERMII_SENDER_ID || 'AfriCredit',
          sms: message,
          type: 'plain',
          channel: 'dnd',
          api_key: process.env.TERMII_API_KEY,
        }),
      });

      const data = await response.json();

      if (response.ok && data.code === 'ok') {
        console.log(`📱 [TERMII SMS FALLBACK DISPATCHED] To: ${termiiPhone}`);
        return data;
      }
    }

    // 3. Tertiary Fallback: Twilio Integration
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
          To: formattedPhone,
          From: process.env.TWILIO_PHONE_NUMBER,
          Body: message,
        }),
      });

      if (response.ok) {
        console.log(`📱 [TWILIO SMS FALLBACK DISPATCHED] To: ${formattedPhone}`);
        return;
      }
    }

    // 4. Dev Fallback: Console Output
    console.log(`📱 [SMS CONSOLE FALLBACK] To: ${formattedPhone} | Message: "${message}"`);
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