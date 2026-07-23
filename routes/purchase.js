const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const User = require('../models/User');
const VolunteerRegistration = require('../models/VolunteerRegistration');
const Settings = require('../models/Settings');
const { protect } = require('../middleware/authMiddleware');
const { recordBookPurchase } = require('../utils/batchLogic');
const { sendPurchaseConfirmationEmail, sendAdminPurchaseNotificationEmail } = require('../utils/sendEmail');
const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});



// STEP 1 — create the Razorpay order + a pending registration record
router.post('/create-order', protect, async (req, res) => {
  try {
    const { name, contactNumber, email, introducedByRegId, bookCount } = req.body;

    if (!name || !contactNumber || !email || !bookCount || bookCount < 1) {
      return res.status(400).json({ error: 'Missing or invalid checkout details.' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Always read the current price from Settings -- never trust a price
    // sent from the frontend, and never let this drift from what admins set.
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});
    const pricePerBook = settings.pricePerBook;

    const totalAmount = bookCount * pricePerBook;

    const order = await razorpay.orders.create({
      amount: totalAmount * 100, // paise
      currency: 'INR',
      receipt: `books_${user.regNo}_${Date.now()}`,
      notes: {
        user_id: String(user._id),
        reg_no: user.regNo,
        books_count: String(bookCount)
      }
    });

    const registration = await VolunteerRegistration.create({
      user: user._id,
      razorpayOrderId: order.id,
      booksHelperName: name,
      mobilePhone: contactNumber,
      email,
      numberOfFreeBooks: bookCount,
      amount: totalAmount,
      introducedBy: introducedByRegId || null,
      regNo: user.regNo,
      status: 'CREATED'
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      registrationId: registration._id,
      pricePerBook // send it back so the frontend can display it accurately too
    });
  } catch (err) {
    console.error('create-order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// STEP 2 — verify the payment after Razorpay Checkout completes
router.post('/verify', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, registrationId } = req.body;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      await VolunteerRegistration.findByIdAndUpdate(registrationId, { status: 'FAILED' });
      return res.status(400).json({ error: 'Payment verification failed.' });
    }

    const fullPaymentDetails = await razorpay.payments.fetch(razorpay_payment_id);

    const registration = await VolunteerRegistration.findOneAndUpdate(
      { _id: registrationId, user: req.userId }, // ensures a user can't verify someone else's order
      {
        razorpayPaymentId: razorpay_payment_id,
        rawPaymentDetails: fullPaymentDetails,
        status: 'CAPTURED'
      },
      { new: true }
    );

    if (!registration) {
      return res.status(404).json({ error: 'Registration record not found.' });
    }

    // This is the real trigger for Volunteer -> RO / RO -> SO promotion,
    // driven by an actual verified payment.
    const updatedUser = await recordBookPurchase(req.userId, registration.numberOfFreeBooks);
   

    try {
      await sendPurchaseConfirmationEmail({
        to: registration.email,
        name: registration.booksHelperName,
        booksCount: registration.numberOfFreeBooks,
        amount: registration.amount,
        regNo: registration.regNo,
        paymentId: registration.razorpayPaymentId
      });
    } catch (emailErr) {
      console.error('Failed to send confirmation email:', emailErr.message);
    }
    try {
  await sendAdminPurchaseNotificationEmail({
    name: registration.booksHelperName,
    booksCount: registration.numberOfFreeBooks,
    amount: registration.amount,
    regNo: registration.regNo,
    paymentId: registration.razorpayPaymentId,
    email: registration.email
  });
} catch (emailErr) {
  console.error('Failed to send admin notification email:', emailErr.message);
}

    res.json({ message: 'Payment verified.', user: updatedUser, registration });
  } catch (err) {
    console.error('verify error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/my-history', protect, async (req, res) => {
  const history = await VolunteerRegistration.find({ user: req.userId, status: 'CAPTURED' })
    .sort({ createdAt: -1 })
    .select('numberOfFreeBooks amount status createdAt razorpayPaymentId booksHelperName regNo');
  res.json(history);
});

module.exports = router;