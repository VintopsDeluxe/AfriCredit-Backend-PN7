// src/services/emailService.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: process.env.SMTP_PORT || 2525,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export class EmailService {
    static async sendEmail({ to, subject, html, text }) {
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || '"AfriCredit Platform" <noreply@africredit.com>',
                to,
                subject,
                text,
                html,
            };

            const info = await transporter.sendMail(mailOptions);
            console.log(`✉️ Email sent successfully to ${to}: ${info.messageId}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error(`❌ Failed to send email to ${to}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    static async sendKYCStatusEmail(to, fullName, status) {
        const subject = `AfriCredit: Your KYC Verification is ${status.toUpperCase()}`;
        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2>Hello ${fullName},</h2>
                <p>Your KYC verification submission status has been updated to: <strong>${status.toUpperCase()}</strong>.</p>
                <p>If you have any questions, please reach out to our support team.</p>
                <br/>
                <p>Best regards,</p>
                <p><strong>The AfriCredit Team</strong></p>
            </div>
        `;
        const text = `Hello ${fullName}, Your KYC verification status is now ${status.toUpperCase()}.`;

        return this.sendEmail({ to, subject, html, text });
    }
}