const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { customAlphabet } = require('nanoid');
const User = require('../models/User');
const { generateRegNo } = require('../utils/regNoGenerator');
const { sendWelcomeEmail, sendNewRecruitNotificationEmail } = require('../utils/sendEmail');
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

    let parent;

    if (referralCode) {
      parent = await User.findOne({ referralCode });
      if (!parent) {
        return res.status(400).json({ error: 'Invalid recruitment code.' });
      }
    } else {
      parent = await User.findOne({ role: 'ADMIN' });
      if (!parent) {
        return res.status(500).json({ error: 'No admin account is configured.' });
      }
    }

    const referredBy = parent._id;

    const siblingCount = await User.countDocuments({ referredBy: parent._id });
    const orderInParent = siblingCount + 1;

    const role = 'VOLUNTEER';

    const hashedPassword = await bcrypt.hash(password, 10);

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

    // Send both emails after the account is fully created. Failure here
    // should never block registration itself -- the account already exists
    // and the token is already issued, so we just log and move on.
    try {
      await sendWelcomeEmail({
        to: newUser.email,
        name: newUser.name,
        regNo: newUser.regNo,
        referralCode: newUser.referralCode
      });
    } catch (emailErr) {
      console.error('Failed to send welcome email:', emailErr.message);
    }

    try {
      await sendNewRecruitNotificationEmail({
        to: parent.email,
        parentName: parent.name,
        newRecruitName: newUser.name,
        newRecruitRegNo: newUser.regNo
      });
    } catch (emailErr) {
      console.error('Failed to send parent notification email:', emailErr.message);
    }

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