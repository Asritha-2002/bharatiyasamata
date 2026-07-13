const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { customAlphabet } = require('nanoid');
const User = require('../models/User');
const { generateRegNo } = require('../utils/regNoGenerator');

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

    // Resolve the referrer. A code is looked up as before; if none was sent,
    // we fall back to the main admin account instead of leaving referredBy
    // null. This closes a bug where an empty referral code used to make the
    // new signup an ADMIN (see `role` assignment below).
    let parent;

    if (referralCode) {
      parent = await User.findOne({ referralCode });
      if (!parent) {
        return res.status(400).json({ error: 'Invalid referral code.' });
      }
    } else {
      // NOTE: assumes exactly one ADMIN account exists. If that ever isn't
      // true, replace this with a fixed admin _id from an env var instead
      // (safer + avoids a query whose result would otherwise be arbitrary).
      parent = await User.findOne({ role: 'ADMIN' });
      if (!parent) {
        return res.status(500).json({ error: 'No admin account is configured.' });
      }
    }

    const referredBy = parent._id;

    // Count existing children of this parent to determine this new user's position
    const siblingCount = await User.countDocuments({ referredBy: parent._id });
    const orderInParent = siblingCount + 1;

    const role = 'VOLUNTEER';

    const hashedPassword = await bcrypt.hash(password, 10);

    // Ensure the generated referral code is actually unique
    let newCode;
    let codeExists = true;
    while (codeExists) {
      newCode = generateCode();
      codeExists = await User.findOne({ referralCode: newCode });
    }

    const regNo = await generateRegNo();

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      contactNumber,
      password: hashedPassword,
      referralCode: newCode,
      regNo,
      referredBy,
      orderInParent,
      role,
    });

    const token = jwt.sign({ id: newUser._id, role: newUser.role }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        referralCode: newUser.referralCode,
      },
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