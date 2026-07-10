const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { customAlphabet } = require('nanoid');
const User = require('../models/User');

const router = express.Router();

// Generates short, readable referral codes like "BS7K2P9X"
const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

// POST /api/auth/register
// If no referralCode is provided, this is treated as an Admin-created root user
// (in practice, only your seed script or an admin-only route should allow that).
router.post('/register', async (req, res) => {
  try {
    const { name, email, contactNumber, password, referralCode } = req.body;

    if (!name || !email || !contactNumber || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    let referredBy = null;
    let orderInParent = 0;

    if (referralCode) {
      const parent = await User.findOne({ referralCode });
      if (!parent) {
        return res.status(400).json({ error: 'Invalid referral code.' });
      }
      referredBy = parent._id;

      // Count existing children of this parent to determine this new user's position
      const siblingCount = await User.countDocuments({ referredBy: parent._id });
      orderInParent = siblingCount + 1;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Ensure the generated referral code is actually unique
    let newCode;
    let codeExists = true;
    while (codeExists) {
      newCode = generateCode();
      codeExists = await User.findOne({ referralCode: newCode });
    }

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      contactNumber,
      password: hashedPassword,
      referralCode: newCode,
      referredBy,
      orderInParent,
      role: referredBy ? 'VOLUNTEER' : 'ADMIN' // no referral code = root/admin case
    });

    const token = jwt.sign({ id: newUser._id, role: newUser.role }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        referralCode: newUser.referralCode
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        referralCode: user.referralCode
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;