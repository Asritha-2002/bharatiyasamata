const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

async function sendPurchaseConfirmationEmail({ to, name, booksCount, amount, regNo, paymentId }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #344256;">Payment Confirmation</h2>
      <p>Dear ${name},</p>
      <p>Thank you for your purchase. Here are your payment details:</p>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #666;">Books Purchased</td><td style="padding: 8px 0; text-align: right; font-weight: bold;">${booksCount}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Amount Paid</td><td style="padding: 8px 0; text-align: right; font-weight: bold;">₹${amount}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Registration ID</td><td style="padding: 8px 0; text-align: right; font-weight: bold;">${regNo}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Payment ID</td><td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${paymentId}</td></tr>
      </table>

      <p style="color: #666; font-size: 13px;">You can download your invoice anytime from your dashboard's Purchase History tab.</p>
      <p style="margin-top: 24px; color: #999; font-size: 12px;">Bharatiya Samata Hindi Prachar Parishad</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Bharatiya Samata" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Payment Confirmation — Book Purchase',
    html
  });
}

module.exports = { sendPurchaseConfirmationEmail };