const mongoose = require('mongoose');

const clearVideos = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/educational-portal');
    console.log('Connected to MongoDB');
    
    // Drop videos collection
    await mongoose.connection.collection('videos').deleteMany({});
    console.log('Cleared videos collection');
    
    await mongoose.disconnect();
    console.log('Disconnected');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

clearVideos();
