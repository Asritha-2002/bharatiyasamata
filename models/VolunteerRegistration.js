const mongoose = require('mongoose');

const volunteerRegistrationSchema = new mongoose.Schema({
  // Razorpay identifiers
  razorpayPaymentId: { type: String, required: true, unique: true },
  razorpayOrderId: { type: String },

  // Fields exactly matching "Volunteer S O Regn Form - NIP 2026"
  booksHelperName: { type: String },
  mobilePhone: { type: String },
  dateOfBirth: { type: String },
  numberOfFreeBooks: { type: String },
  registerAs: { type: String }, // "SO" or "RO"
  asIAm: { type: String },
  qualification: { type: String },
  place: { type: String },
  email: { type: String },
  amount: { type: Number },
  introducedBy: { type: String }, // Name and Reg No

  status: { type: String, enum: ['CAPTURED', 'FAILED'], default: 'CAPTURED' },
  rawNotes: { type: mongoose.Schema.Types.Mixed }, // full notes object, as a safety net
  rawPaymentDetails: { type: mongoose.Schema.Types.Mixed }, // full Razorpay payment entity

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('VolunteerRegistration', volunteerRegistrationSchema);