const User = require('../models/User');

const REG_PREFIX = 'AP26BS';
const START_NUMBER = 300; // first-ever regNo will be AP26BS000300
const PAD_LENGTH = 6;     // AP26BS + 000300 = 6 digits

// Format: AP26BS000300, AP26BS000301, ... sequential and human-readable,
// matching the style of a real organizational registration number.
async function generateRegNo() {
  const lastUser = await User.findOne({ regNo: { $exists: true, $ne: null } })
    .sort({ createdAt: -1 })
    .select('regNo');

  let nextNumber = START_NUMBER;
  if (lastUser && lastUser.regNo) {
    const match = lastUser.regNo.match(/(\d+)$/);
    if (match) {
      const lastNumber = parseInt(match[1], 10);
      // Only increment past the last used number -- never drop below
      // START_NUMBER, even if the DB is empty or has stale/lower values.
      nextNumber = Math.max(lastNumber + 1, START_NUMBER);
    }
  }

  const regNo = `${REG_PREFIX}${String(nextNumber).padStart(PAD_LENGTH, '0')}`;

  // Safety check in case of any race condition — extremely unlikely but cheap to guard
  const exists = await User.findOne({ regNo });
  if (exists) {
    return generateRegNo(); // retry with next number
  }

  return regNo;
}

module.exports = { generateRegNo };