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
      <p>Thank you for your books help. Here are your payment details:</p>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #666;">Helped Books</td><td style="padding: 8px 0; text-align: right; font-weight: bold;">${booksCount}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Amount Helped</td><td style="padding: 8px 0; text-align: right; font-weight: bold;">₹${amount}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Registration ID</td><td style="padding: 8px 0; text-align: right; font-weight: bold;">${regNo}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Payment ID</td><td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${paymentId}</td></tr>
      </table>

      <p style="color: #666; font-size: 13px;">You can download your invoice anytime from your dashboard's Helped Books History tab.</p>
      <p style="margin-top: 24px; color: #999; font-size: 12px;">Bharatiya Samata Hindi Prachar Parishad</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Bharatiya Samata" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Payment Confirmation — Helped Books',
    html
  });
}

// Notifies the admin inbox whenever someone submits the public contact form.
// Sent TO the admin (not the person who submitted it) -- it's an internal
// heads-up, not a confirmation to the visitor. Uses the same GMAIL_USER
// account both as sender and recipient unless CONTACT_NOTIFY_EMAIL is set,
// in case you want it routed to a different inbox later.
// Contact form fields are unsanitized public input -- escape them before
// dropping into HTML so a submission can't inject markup/scripts into the
// admin's email client.
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendContactNotificationEmail({ name, mobile, email, message }) {
  const recipient = process.env.CONTACT_NOTIFY_EMAIL || process.env.GMAIL_USER;
  const safeName = escapeHtml(name);
  const safeMobile = escapeHtml(mobile);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #344256;">New Contact Form Submission</h2>
      <p>Someone just submitted the contact form on the website. Details below:</p>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #666;">Name</td><td style="padding: 8px 0; text-align: right; font-weight: bold;">${safeName}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Mobile</td><td style="padding: 8px 0; text-align: right; font-weight: bold;">${safeMobile}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Email</td><td style="padding: 8px 0; text-align: right; font-weight: bold;">${safeEmail}</td></tr>
      </table>

      ${safeMessage ? `
        <p style="color: #666; margin-bottom: 4px;">Message</p>
        <p style="background: #f5f5f5; padding: 12px; border-radius: 6px; color: #344256; white-space: pre-wrap;">${safeMessage}</p>
      ` : `
        <p style="color: #999; font-size: 13px;">No message was included.</p>
      `}

      <p style="margin-top: 24px; color: #999; font-size: 12px;">Bharatiya Samata Hindi Prachar Parishad — Contact Form</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Bharatiya Samata Website" <${process.env.GMAIL_USER}>`,
    to: recipient,
    replyTo: email,
    subject: `New Contact Form Message from ${name}`,
    html
  });
}

async function sendWelcomeEmail({ to, name, regNo, referralCode }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #344256;">Welcome to Bharatiya Samata Hindi Prachar Parishad</h2>
      <p>Dear ${name},</p>
      <p>Your registration was successful. Here are your account details:</p>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #666;">Registration ID</td><td style="padding: 8px 0; text-align: right; font-weight: bold;">${regNo}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Your Referral Code</td><td style="padding: 8px 0; text-align: right; font-weight: bold;">${referralCode}</td></tr>
      </table>

      <p style="color: #666; font-size: 13px;">
        You can log in to your dashboard anytime to track your progress, view your network, and manage your book purchases.
        To start recruiting others, purchase at least 2 books through your dashboard first.
      </p>
      <p style="margin-top: 24px; color: #999; font-size: 12px;">Bharatiya Samata Hindi Prachar Parishad</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Bharatiya Samata" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Welcome — Registration Successful',
    html
  });
}

// Sent to the parent (referrer), notifying them that someone new registered under them.
async function sendNewRecruitNotificationEmail({ to, parentName, newRecruitName, newRecruitRegNo }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #344256;">New Recruit Joined Your Network</h2>
      <p>Dear ${parentName},</p>
      <p>Someone has just registered using your referral code:</p>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #666;">Name</td><td style="padding: 8px 0; text-align: right; font-weight: bold;">${newRecruitName}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Registration ID</td><td style="padding: 8px 0; text-align: right; font-weight: bold;">${newRecruitRegNo}</td></tr>
      </table>

      <p style="color: #666; font-size: 13px;">You can view them under your network in your dashboard.</p>
      <p style="margin-top: 24px; color: #999; font-size: 12px;">Bharatiya Samata Hindi Prachar Parishad</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Bharatiya Samata" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'New Recruit Joined Your Network',
    html
  });
}

module.exports = { 
  sendPurchaseConfirmationEmail, 
  sendContactNotificationEmail,
   sendWelcomeEmail,
  sendNewRecruitNotificationEmail
};