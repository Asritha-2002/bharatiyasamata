const ContactMessage = require('../models/ContactMessage');
const { sendContactNotificationEmail } = require('../utils/sendEmail'); // adjust path to wherever your mailer file lives

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/contact -- public. Anyone visiting the site can submit this,
// so validation happens here rather than trusting the frontend.
async function submitContactMessage(req, res) {
  try {
    const { name, mobile, email, message } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (!mobile || !mobile.trim()) {
      return res.status(400).json({ message: 'Mobile number is required' });
    }
    if (!email || !EMAIL_PATTERN.test(email.trim())) {
      return res.status(400).json({ message: 'A valid email is required' });
    }

    const contactMessage = await ContactMessage.create({
      name: name.trim(),
      mobile: mobile.trim(),
      email: email.trim(),
      message: message ? message.trim() : '',
    });

    // Notify the admin inbox. This runs after the record is safely saved,
    // and its failure must NOT fail the request -- the person's message is
    // already stored either way, so we just log and move on if the email
    // doesn't go out (same pattern as the Cloudinary cleanup calls elsewhere).
    sendContactNotificationEmail({
      name: contactMessage.name,
      mobile: contactMessage.mobile,
      email: contactMessage.email,
      message: contactMessage.message,
    }).catch((err) => {
      console.error('Failed to send contact notification email:', err.message);
    });

    res.status(201).json({
      message: 'Thanks for reaching out -- we\'ll get back to you soon.',
      contactMessage,
    });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to submit your message',
      error: err.message,
    });
  }
}

// GET /api/contact (admin only) -- newest first, for the Contact History tab
async function getContactMessages(req, res) {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.status(200).json({ messages });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to load messages',
      error: err.message,
    });
  }
}

// PATCH /api/contact/:id/read (admin only)
async function markContactMessageRead(req, res) {
  try {
    const updated = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Message not found' });
    }
    res.status(200).json({ contactMessage: updated });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to update message',
      error: err.message,
    });
  }
}

// DELETE /api/contact/:id (admin only)
async function deleteContactMessage(req, res) {
  try {
    const deleted = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Message not found' });
    }
    res.status(200).json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to delete message',
      error: err.message,
    });
  }
}

module.exports = {
  submitContactMessage,
  getContactMessages,
  markContactMessageRead,
  deleteContactMessage,
};