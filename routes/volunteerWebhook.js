const express = require('express');
const crypto = require('crypto');
const VolunteerRegistration = require('../models/VolunteerRegistration');
const BookDonation = require('../models/BookDonation');

const router = express.Router();

// Helper: pull a value out of the notes object regardless of minor label variations
function getNote(notes, ...possibleKeys) {
  for (const key of possibleKeys) {
    if (notes[key] !== undefined) return notes[key];
  }
  return null;
}

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(req.body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid webhook signature.' });
    }

    const event = JSON.parse(req.body);

    if (event.event !== 'payment.captured') {
      return res.json({ status: 'ignored', reason: 'not a captured payment event' });
    }

    const paymentEntity = event.payload.payment.entity;
    const notes = paymentEntity.notes || {};

    // Distinguish which of the two forms this payment came from.
    // The most reliable signal is a field unique to one form —
    // "Books Helper Name" only exists on the Volunteer/SO/RO form.
    const isVolunteerForm = notes['Books Helper Name'] !== undefined;

    if (isVolunteerForm) {
      const existing = await VolunteerRegistration.findOne({ razorpayPaymentId: paymentEntity.id });
      if (existing) return res.json({ status: 'already recorded' });

      await VolunteerRegistration.create({
        razorpayPaymentId: paymentEntity.id,
        razorpayOrderId: paymentEntity.order_id,
        booksHelperName: getNote(notes, 'Books Helper Name'),
        mobilePhone: getNote(notes, 'books helping person Mobile Phone', 'Mobile Phone'),
        dateOfBirth: getNote(notes, 'Date of Birth'),
        numberOfFreeBooks: getNote(notes, 'How many free books wants to give'),
        registerAs: getNote(notes, 'Would like to register As a SO or RO'),
        asIAm: getNote(notes, 'As I am'),
        qualification: getNote(notes, 'your Qualification'),
        place: getNote(notes, 'your Place'),
        email: getNote(notes, 'your Email') || paymentEntity.email,
        amount: paymentEntity.amount / 100, // convert paise -> rupees
        introducedBy: getNote(notes, 'Who INTRODUCED Name and REG NO'),
        rawNotes: notes,
        rawPaymentDetails: paymentEntity
      });
    } else {
      const existing = await BookDonation.findOne({ razorpayPaymentId: paymentEntity.id });
      if (existing) return res.json({ status: 'already recorded' });

      await BookDonation.create({
        razorpayPaymentId: paymentEntity.id,
        razorpayOrderId: paymentEntity.order_id,
        numberOfBooks: getNote(notes, 'i will give free books for one book Rs 60'),
        donorName: getNote(notes, 'Name of the Person or Sangham or Donor or Club or Firm'),
        state: getNote(notes, 'STATE'),
        mobilePhone: getNote(notes, 'Mobile Phone No'),
        dateOfBirth: getNote(notes, 'Date of Birth'),
        email: getNote(notes, 'Email') || paymentEntity.email,
        place: getNote(notes, 'Place'),
        totalAmount: paymentEntity.amount / 100,
        introducedBy: getNote(notes, 'WHO INTRODUCED WRITE NAME AND REG NO'),
        rawNotes: notes,
        rawPaymentDetails: paymentEntity
      });
    }

    res.json({ status: 'recorded' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;