import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../model/Product.js';
import User from '../model/User.js';
import Review from '../model/Review.js';
import Category from '../model/Category.js';

dotenv.config();

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for seeding reviews...');

        // Clear existing reviews
        await Review.deleteMany({});
        console.log('Cleared existing reviews.');

        // Ensure we have a category
        let category = await Category.findOne({});
        if (!category) {
            category = new Category({
                name: 'Lipstick',
                description: 'Luxury lipstick collection',
                status: 'ACTIVE'
            });
            await category.save();
        }

        // Ensure we have products matching the names or create them
        const productNames = ['Crimson Velvet', 'Gilded Rose', 'Midnight Plum', 'Nude Silk'];
        const products = [];

        for (const name of productNames) {
            let prod = await Product.findOne({ productName: name });
            if (!prod) {
                prod = new Product({
                    productName: name,
                    brand: 'Veloura',
                    description: `${name} lipstick from Veloura collection.`,
                    categoryId: category._id,
                    status: 'ACTIVE'
                });
                await prod.save();
            }
            products.push(prod);
        }

        // Ensure we have users or create them
        const userNames = ['Elena G.', 'Marcus W.', 'Sophie L.', 'Julian J.'];
        const users = [];

        for (const name of userNames) {
            let usr = await User.findOne({ name: name });
            if (!usr) {
                usr = new User({
                    name: name,
                    email: `${name.toLowerCase().replace(/[^a-z]/g, '')}@example.com`,
                    phone: '9876543210',
                    password: 'password123',
                    isBlocked: false,
                    referralCode: 'REF-MAIN-' + Math.random().toString(36).substring(2,8).toUpperCase()
                });
                await usr.save();
            }
            users.push(usr);
        }

        // Add the 4 pending reviews from the screenshot
        const pendingReviews = [
            {
                user: users[0]._id,
                product: products[0]._id,
                rating: 4,
                title: 'Texture is incredible',
                comment: 'The texture is incredible, it stays all day',
                status: 'Pending',
                createdAt: new Date(Date.now() - 3600000 * 2) // 2 hours ago
            },
            {
                user: users[1]._id,
                product: products[1]._id,
                rating: 5,
                title: 'Lovely shade',
                comment: 'Lovely shade but the packaging arrived slightly bent',
                status: 'Pending',
                createdAt: new Date(Date.now() - 3600000 * 24) // 1 day ago
            },
            {
                user: users[2]._id,
                product: products[2]._id,
                rating: 4,
                title: 'True editorial finish',
                comment: 'A true editorial finish. Very luxury feel!',
                status: 'Pending',
                createdAt: new Date(Date.now() - 3600000 * 48) // 2 days ago
            },
            {
                user: users[3]._id,
                product: products[3]._id,
                rating: 5,
                title: 'Slightly lighter',
                comment: 'Color was lighter than it looked online but still beautiful',
                status: 'Pending',
                createdAt: new Date(Date.now() - 3600000 * 72) // 3 days ago
            }
        ];

        await Review.insertMany(pendingReviews);
        console.log('Seeded 4 pending reviews.');

        // Seed 17 more pending reviews to reach the "21 pending moderation" from the screenshot
        for (let i = 1; i <= 17; i++) {
            const tempUser = new User({
                name: `Customer ${i}`,
                email: `customer${i}@example.com`,
                phone: `98765400${i.toString().padStart(2, '0')}`,
                password: 'password123',
                referralCode: 'REF-PEND-' + i + '-' + Math.random().toString(36).substring(2,6).toUpperCase()
            });
            await tempUser.save();

            const tempReview = new Review({
                user: tempUser._id,
                product: products[i % products.length]._id,
                rating: (i % 3) + 3, // 3, 4, 5 ratings
                title: `Moderate feedback ${i}`,
                comment: `This is a sample pending feedback number ${i} to test pagination and moderation counters.`,
                status: 'Pending',
                createdAt: new Date(Date.now() - 3600000 * (72 + i))
            });
            await tempReview.save();
        }
        console.log('Seeded 17 extra pending reviews (total 21 pending moderation).');

        // Seed 15 approved reviews to show a "Total Approved" count of 15, and average rating of 4.8
        // Let's make sure the ratings are mostly 5s and some 4s to average exactly ~4.8
        const approvedRatings = [5, 5, 5, 4, 5, 5, 4, 5, 5, 5, 5, 4, 5, 5, 5]; // Sum = 72, Avg = 72/15 = 4.8
        for (let i = 0; i < approvedRatings.length; i++) {
            const user = new User({
                name: `Approved Customer ${i}`,
                email: `approvedcustomer${i}@example.com`,
                phone: `98765300${i.toString().padStart(2, '0')}`,
                password: 'password123',
                referralCode: 'REF-APPR-' + i + '-' + Math.random().toString(36).substring(2,6).toUpperCase()
            });
            await user.save();

            const review = new Review({
                user: user._id,
                product: products[i % products.length]._id,
                rating: approvedRatings[i],
                title: 'Loved it!',
                comment: 'Absolutely amazing product, highly recommend it to everyone.',
                status: 'Approved'
            });
            await review.save();
        }
        console.log('Seeded 15 approved reviews (averaging 4.8 rating).');

        // Seed 3 rejected reviews for "Rejected Today"
        for (let i = 1; i <= 3; i++) {
            const user = new User({
                name: `Rejected Customer ${i}`,
                email: `rejectedcustomer${i}@example.com`,
                phone: `98765200${i.toString().padStart(2, '0')}`,
                password: 'password123',
                referralCode: 'REF-REJE-' + i + '-' + Math.random().toString(36).substring(2,6).toUpperCase()
            });
            await user.save();

            const review = new Review({
                user: user._id,
                product: products[i % products.length]._id,
                rating: 1,
                title: 'Bad product',
                comment: 'Spam review content rejected automatically.',
                status: 'Rejected',
                updatedAt: new Date() // updated today
            });
            await review.save();
        }
        console.log('Seeded 3 rejected reviews for today.');

        console.log('Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding reviews:', error);
        process.exit(1);
    }
}

seed();
