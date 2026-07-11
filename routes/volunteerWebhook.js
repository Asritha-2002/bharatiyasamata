const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const VolunteerRegistration = require('../models/VolunteerRegistration');
const { recordBookPurchase } = require('../utils/batchLogic');

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

    const existing = await VolunteerRegistration.findOne({ razorpayPaymentId: p.id });
    if (existing) return res.json({ status: 'already recorded' });

    const booksRaw = notes.how_many_free_books_wants_to_give || '0';
    const booksCount = parseInt(booksRaw, 10) || 0;
    const determinedRole = booksCount >= 2 ? 'RO' : 'VOLUNTEER';

    // "Your REG NO" is pre-filled by our own dashboard link with the paying
    // user's real regNo — this is how we identify who made the payment.
    const payerRegNo = notes.your_reg_no || null;
    let linkedUser = null;
    if (payerRegNo) {
      linkedUser = await User.findOne({ regNo: payerRegNo });
    }

    await VolunteerRegistration.create({
      user: linkedUser ? linkedUser._id : null,
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
      introducedBy: notes.who_introduced_name_and_reg_no || null, // parent's regNo, typed manually
      regNo: payerRegNo,
      rawNotes: notes,
      rawPaymentDetails: p
    });

    if (linkedUser) {
      await recordBookPurchase(linkedUser._id, booksCount);
    }

    res.json({ status: 'recorded', linkedUser: linkedUser ? linkedUser.regNo : null, booksCount, determinedRole });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;