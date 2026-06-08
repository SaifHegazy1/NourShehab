const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function generateUniqueCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

async function main() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/educational-portal';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Define User schema
        const userSchema = new mongoose.Schema({
            username: { type: String, required: true, unique: true, trim: true },
            uniqueCode: { type: String, required: true, unique: true },
            passwordHash: { type: String, default: null },
            allowedViews: { type: Number, default: 0, min: 0 },
            perVideoViews: [{ video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' }, views: { type: Number, default: 0, min: 0 } }],
            role: { type: String, enum: ['student', 'admin'], default: 'student' },
            createdAt: { type: Date, default: Date.now }
        });

        const User = mongoose.model('User', userSchema);

        // Check if admin already exists
        const existingAdmin = await User.findOne({ username: 'Farah' });
        if (existingAdmin) {
            console.log('Admin account "Farah" already exists!');
            await mongoose.disconnect();
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash('Farah1441!', 10);
        const uniqueCode = await generateUniqueCode();

        // Create admin
        const admin = await User.create({
            username: 'Farah',
            uniqueCode: uniqueCode,
            passwordHash: hashedPassword,
            allowedViews: 0,
            role: 'admin'
        });

        console.log('Admin account created successfully!');
        console.log('Username: Farah');
        console.log('Password: Farah1441!');
        console.log('Unique Code:', uniqueCode);
        console.log('Admin ID:', admin._id);

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

main();
