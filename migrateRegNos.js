require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const { generateRegNo } = require('./utils/regNoGenerator');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);

  const usersWithoutRegNo = await User.find({
    $or: [{ regNo: { $exists: false } }, { regNo: null }]
  }).sort({ createdAt: 1 }); // oldest first, so Admin gets BSHP-0001

  console.log(`Found ${usersWithoutRegNo.length} users missing a regNo.`);

  for (const user of usersWithoutRegNo) {
    const regNo = await generateRegNo();
    user.regNo = regNo;
    await user.save();
    console.log(`Assigned ${regNo} to ${user.name} (${user.email})`);
  }

  console.log('Migration complete.');
  process.exit(0);
}

migrate();