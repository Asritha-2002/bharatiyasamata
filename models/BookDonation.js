const mongoose = require('mongoose');

const bookDonationSchema = new mongoose.Schema({
  razorpayPaymentId: { type: String, required: true, unique: true },
  razorpayOrderId: { type: String },

  // Fields exactly matching "Free Books Help for Needy Children-NIP"
  numberOfBooks: { type: String },
  donorName: { type: String }, // Person/Sangham/Donor/Club/Firm
  state: { type: String },
  mobilePhone: { type: String },
  dateOfBirth: { type: String },
  email: { type: String },
  place: { type: String },
  totalAmount: { type: Number },
  introducedBy: { type: String },

  status: { type: String, enum: ['CAPTURED', 'FAILED'], default: 'CAPTURED' },
  rawNotes: { type: mongoose.Schema.Types.Mixed },
  rawPaymentDetails: { type: mongoose.Schema.Types.Mixed },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BookDonation', bookDonationSchema);