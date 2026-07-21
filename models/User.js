const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  contactNumber: { type: String, required: true },
  password: { type: String, required: true },

  role: {
    type: String,
    enum: ['ADMIN', 'VOLUNTEER', 'RO', 'SO'],
    default: 'VOLUNTEER'
  },

  referralCode: { type: String, required: true, unique: true },
  regNo: { type: String, required: true, unique: true },

  // NEW — address fields
  state: { type: String, required: true },      // full name, e.g. "Andhra Pradesh"
  stateCode: { type: String, required: true },   // e.g. "AP" — used later in regNo generation
  city: { type: String, default: null },
  houseNumber: { type: String, default: null },

  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  orderInParent: { type: Number, default: 0 },

  hasPurchasedBooks: { type: Boolean, default: false },
  lastPurchaseYear: { type: Number, default: null },
  totalBooksThisYear: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);