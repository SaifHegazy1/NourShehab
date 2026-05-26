const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/educational-portal');
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
  const user = await User.findOne({ username: 'student_test' });
  if (!user) {
    console.log('student_test not found');
    process.exit(0);
  }
  user.allowedViews = 5;
  await user.save();
  console.log('updated allowedViews to', user.allowedViews);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
