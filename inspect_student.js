const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/educational-portal');
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
  const users = await User.find({ username: 'student_test' }).lean();
  console.log('found users:', users.length);
  users.forEach(u => {
    console.log(JSON.stringify({ _id: u._id, username: u.username, allowedViews: u.allowedViews, uniqueCode: u.uniqueCode, passwordHash: !!u.passwordHash }, null, 2));
  });
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
