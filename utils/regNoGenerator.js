const Counter = require('../models/Counter');

const COUNTER_ID = 'regNo';
const REG_MIDDLE = '26BS';
const START_NUMBER = 300; // first-ever regNo overall will be {CODE}26BS0300
const PAD_LENGTH = 4;     // 0300, 0301, ...

// Format: {stateCode}26BS{number} e.g. AP26BS0300, TN26BS0301, BR26BS0302
// One single global sequence shared across all states -- the number always
// increments by registration order; only the prefix changes based on the
// registering user's state.
async function generateRegNo(stateCode) {
  if (!stateCode) {
    throw new Error('stateCode is required to generate a registration number.');
  }

  // Atomic increment -- avoids any race condition between simultaneous
  // registrations, unlike a "read last regNo, then write" approach.
  const counter = await Counter.findOneAndUpdate(
    { _id: COUNTER_ID },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // On the very first-ever call, this document didn't exist, so $inc
  // creates it starting from 1. We want the first number issued to be
  // START_NUMBER (300) instead -- so detect that case and correct it.
  let number = counter.seq;
  if (number === 1) {
    number = START_NUMBER;
    await Counter.updateOne({ _id: COUNTER_ID }, { $set: { seq: START_NUMBER } });
  }

  const regNo = `${stateCode}${REG_MIDDLE}${String(number).padStart(PAD_LENGTH, '0')}`;
  return regNo;
}

module.exports = { generateRegNo };