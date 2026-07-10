require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { customAlphabet } = require('nanoid');
const User = require('./models/User');

const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ role: 'ADMIN' });
  if (existing) {
    console.log('Admin already exists:', existing.referralCode);
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash('admin123', 10); // change after first login
  const admin = await User.create({
    name: 'Main Admin',
    email: 'admin@bharatiyasamata.com',
    contactNumber: '9989768564',
    password: hashedPassword,
    role: 'ADMIN',
    referralCode: generateCode(),
    referredBy: null,
    hasPurchasedBooks: true
  });

  console.log('Admin created. Referral code:', admin.referralCode);
  process.exit(0);
}

seed();