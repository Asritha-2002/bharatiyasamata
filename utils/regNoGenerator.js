const User = require('../models/User');

// Format: BSHP-0001, BSHP-0002, ... sequential and human-readable,
// matching the style of a real organizational registration number.
async function generateRegNo() {
  const lastUser = await User.findOne({ regNo: { $exists: true, $ne: null } })
    .sort({ createdAt: -1 })
    .select('regNo');

  let nextNumber = 1;
  if (lastUser && lastUser.regNo) {
    const match = lastUser.regNo.match(/(\d+)$/);
    if (match) nextNumber = parseInt(match[1], 10) + 1;
  }

  const regNo = `AP26BS${String(nextNumber).padStart(4, '0')}`;

  // Safety check in case of any race condition — extremely unlikely but cheap to guard
  const exists = await User.findOne({ regNo });
  if (exists) {
    return generateRegNo(); // retry with next number
  }

  return regNo;
}

module.exports = { generateRegNo };