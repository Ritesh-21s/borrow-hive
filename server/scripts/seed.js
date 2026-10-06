/**
 * BorrowHive — Database seed script
 * Creates a demo community + admin user for local development
 *
 * Usage: node scripts/seed.js
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Community = require('../src/models/Community');
const User = require('../src/models/User');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clean up existing seed data
  await Community.deleteOne({ inviteCode: 'KPRIET2026' });

  // Create community
  const community = await Community.create({
    name: 'KPRIET Campus',
    emailDomain: 'kpriet.ac.in',
    inviteCode: 'KPRIET2026',
    description: 'Kumaraguru College of Technology campus community',
    memberCount: 0,
  });
  console.log('✅ Community created:', community.name, '| Invite code:', community.inviteCode);

  // Create demo users
  const usersData = [
    { name: 'Ritesh Kumar', email: 'ritesh@kpriet.ac.in', password: 'password123' },
    { name: 'Arun Sharma', email: 'arun@kpriet.ac.in', password: 'password123' },
    { name: 'Priya Nair', email: 'priya@kpriet.ac.in', password: 'password123' },
  ];

  for (const u of usersData) {
    await User.deleteOne({ email: u.email });
    const hash = await bcrypt.hash(u.password, 10);
    const user = await User.create({ name: u.name, email: u.email, passwordHash: hash, communityId: community._id });
    console.log(`✅ User: ${user.name} (${user.email})`);
  }

  await Community.findByIdAndUpdate(community._id, { memberCount: usersData.length });
  console.log('\n🎉 Seed complete!');
  console.log('\nLogin credentials:');
  usersData.forEach(u => console.log(`  ${u.email} / ${u.password}`));
  console.log(`\nCommunity invite code: KPRIET2026`);

  await mongoose.disconnect();
};

seed().catch(err => { console.error(err); process.exit(1); });
