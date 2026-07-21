const mongoose = require('mongoose');

const volunteerRegistrationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  razorpayPaymentId: { type: String, },
  razorpayOrderId: { type: String, required: true },

  booksHelperName: String,
  mobilePhone: String,
  email: String,
  numberOfFreeBooks: { type: Number, default: 0 },
  registerAs: { type: String, enum: ['VOLUNTEER', 'RO'], default: 'VOLUNTEER' },
  amount: Number,
  introducedBy: String, // parent's regNo, entered/prefilled on checkout
  regNo: { type: String, default: null }, // the payer's own regNo

  status: { type: String, enum: ['CREATED', 'CAPTURED', 'FAILED'], default: 'CREATED' },
  rawPaymentDetails: mongoose.Schema.Types.Mixed,

  createdAt: { type: Date, default: Date.now }
});
volunteerRegistrationSchema.index(
  { razorpayPaymentId: 1 },
  { unique: true, partialFilterExpression: { razorpayPaymentId: { $type: 'string' } } }
);

module.exports = mongoose.model('VolunteerRegistration', volunteerRegistrationSchema);