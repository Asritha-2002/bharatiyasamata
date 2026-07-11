const express = require('express');
const crypto = require('crypto');
const VolunteerRegistration = require('../models/VolunteerRegistration');

const router = express.Router();

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

    // TEMPORARY diagnostic log — remove once you've confirmed field names
    // are correct via one successful test payment.
    console.log('=== Webhook notes received ===');
    console.log(JSON.stringify(notes, null, 2));
    console.log('===============================');

    const existing = await VolunteerRegistration.findOne({ razorpayPaymentId: p.id });
    if (existing) return res.json({ status: 'already recorded' });

    // "How many free books wants to give" is now a dropdown (e.g. "1 book",
    // "2 books", "5 books"...) instead of free text — extract the leading number.
    const booksRaw = notes.how_many_free_books_wants_to_give || '0';
    const booksCount = parseInt(booksRaw, 10) || 0;

    // Role is ALWAYS computed from books count — never trusted from any form field,
    // since the role-selection dropdown has been removed from the form entirely.
    const determinedRole = booksCount >= 2 ? 'RO' : 'VOLUNTEER';

    await VolunteerRegistration.create({
      razorpayPaymentId: p.id,
      razorpayOrderId: p.order_id,
      booksHelperName: notes.books_helper_name || null,
      mobilePhone: notes.books_helping_person_mobile_phone || p.contact || null,
      dateOfBirth: notes.date_of_birth || null,
      numberOfFreeBooks: booksCount,
      registerAs: determinedRole,
      asIAm: notes.as_i_am || null,
      qualification: notes.your_qualification || null,
      place: notes.your_place || null,
      email: notes.your_email || p.email || null,
      amount: p.amount / 100,
      introducedBy: notes.who_introduced_reg_no || null, // best guess — log will confirm
      regNo: notes.your_reg_no || null,                  // new field — best guess — log will confirm
      rawNotes: notes,
      rawPaymentDetails: p
    });

    res.json({ status: 'recorded', determinedRole, booksCount });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;