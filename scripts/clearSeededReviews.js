import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Review from '../model/Review.js';
import User from '../model/User.js';

dotenv.config();

async function clearSeeded() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        // Find users seeded by seedReviews.js (all have email ending with @example.com)
        const seededUsers = await User.find({ email: /@example.com$/i });
        const seededUserIds = seededUsers.map(u => u._id);

        console.log(`Found ${seededUserIds.length} seeded users.`);

        // Delete reviews belonging to those users
        const reviewDeleteResult = await Review.deleteMany({ user: { $in: seededUserIds } });
        console.log(`Deleted ${reviewDeleteResult.deletedCount} seeded reviews.`);

        // Delete the seeded users themselves
        const userDeleteResult = await User.deleteMany({ _id: { $in: seededUserIds } });
        console.log(`Deleted ${userDeleteResult.deletedCount} seeded users.`);

        console.log('Database cleaned successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error clearing database:', error);
        process.exit(1);
    }
}

clearSeeded();
