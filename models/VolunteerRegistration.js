const mongoose = require('mongoose');

const volunteerRegistrationSchema = new mongoose.Schema({
  razorpayPaymentId: { type: String, required: true, unique: true },
  razorpayOrderId: { type: String },

  booksHelperName: String,
  mobilePhone: String,
  dateOfBirth: String,
  numberOfFreeBooks: { type: Number, default: 0 },
  registerAs: { type: String, enum: ['VOLUNTEER', 'RO'], default: 'VOLUNTEER' },
  asIAm: String,
  qualification: String,
  place: String,
  email: String,
  amount: Number,
  introducedBy: String,
  regNo: { type: String, default: null }, // new — "Your REG NO" field

  status: { type: String, enum: ['CAPTURED', 'FAILED'], default: 'CAPTURED' },
  rawNotes: mongoose.Schema.Types.Mixed,
  rawPaymentDetails: mongoose.Schema.Types.Mixed,

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('VolunteerRegistration', volunteerRegistrationSchema);