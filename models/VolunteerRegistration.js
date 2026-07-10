const mongoose = require('mongoose');

const volunteerRegistrationSchema = new mongoose.Schema({
  razorpayPaymentId: { type: String, required: true, unique: true },
  razorpayOrderId: { type: String },

  booksHelperName: String,
  mobilePhone: String,
  dateOfBirth: String,
  numberOfFreeBooks: String,
  registerAs: String,
  asIAm: String,
  qualification: String,
  place: String,
  email: String,
  amount: Number,
  introducedBy: String,

  status: { type: String, enum: ['CAPTURED', 'FAILED'], default: 'CAPTURED' },
  rawNotes: mongoose.Schema.Types.Mixed,
  rawPaymentDetails: mongoose.Schema.Types.Mixed,

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('VolunteerRegistration', volunteerRegistrationSchema);