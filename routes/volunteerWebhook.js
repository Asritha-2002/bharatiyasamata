const express = require('express');
const crypto = require('crypto');
const VolunteerRegistration = require('../models/VolunteerRegistration');

const router = express.Router();

function getNote(notes, ...keys) {
  for (const k of keys) if (notes[k] !== undefined) return notes[k];
  return null;
}

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(req.body)
      .digest('hex');

    if (signature !== expected) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(req.body);
    if (event.event !== 'payment.captured') {
      return res.json({ status: 'ignored' });
    }

    const p = event.payload.payment.entity;
    const notes = p.notes || {};

    const existing = await VolunteerRegistration.findOne({ razorpayPaymentId: p.id });
    if (existing) return res.json({ status: 'already recorded' });

    await VolunteerRegistration.create({
      razorpayPaymentId: p.id,
      razorpayOrderId: p.order_id,
      booksHelperName: getNote(notes, 'Books Helper Name'),
      mobilePhone: getNote(notes, 'books helping person Mobile Phone', 'Mobile Phone'),
      dateOfBirth: getNote(notes, 'Date of Birth'),
      numberOfFreeBooks: getNote(notes, 'How many free books wants to give'),
      registerAs: getNote(notes, 'Would like to register As a SO or RO'),
      asIAm: getNote(notes, 'As I am'),
      qualification: getNote(notes, 'your Qualification'),
      place: getNote(notes, 'your Place'),
      email: getNote(notes, 'your Email') || p.email,
      amount: p.amount / 100,
      introducedBy: getNote(notes, 'Who INTRODUCED Name and REG NO'),
      rawNotes: notes,
      rawPaymentDetails: p
    });

    res.json({ status: 'recorded' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;