const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.resend.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  requireTLS: true,
  connectionTimeout: 8000,
  socketTimeout: 8000,
  auth: {
    user: process.env.SMTP_USER || 'resend',
    pass: process.env.SMTP_PASS || '',
  },
});

async function sendEmail({ to, subject, html }) {
  if (!process.env.SMTP_PASS) {
    console.log(`[EMAIL - no SMTP config] To: ${to} | Subject: ${subject}`);
    return;
  }
  const from = process.env.FROM_EMAIL || 'Statefy <noreply@statefy.eu>';
  await transporter.sendMail({ from, to, subject, html });
}

async function sendVerificationCode(email, code) {
  await sendEmail({
    to: email,
    subject: 'Verify your Statefy email',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#E8002D;margin-bottom:8px;">Verify your email</h2>
        <p style="color:#374151;">Enter this code in the Statefy app to confirm your email address:</p>
        <div style="font-size:40px;font-weight:800;letter-spacing:12px;color:#121212;margin:24px 0;text-align:center;">${code}</div>
        <p style="color:#9ca3af;font-size:13px;">This code expires in 15 minutes. If you didn't create a Statefy account, you can ignore this email.</p>
      </div>
    `,
  });
}

async function sendPasswordResetCode(email, code) {
  await sendEmail({
    to: email,
    subject: 'Reset your Statefy password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#E8002D;margin-bottom:8px;">Reset your password</h2>
        <p style="color:#374151;">Enter this code in the Statefy app to reset your password:</p>
        <div style="font-size:40px;font-weight:800;letter-spacing:12px;color:#121212;margin:24px 0;text-align:center;">${code}</div>
        <p style="color:#9ca3af;font-size:13px;">This code expires in 15 minutes. If you didn't request a password reset, you can ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { sendVerificationCode, sendPasswordResetCode };
