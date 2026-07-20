import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../model/Product.js';

dotenv.config();

async function clean() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        const mockProductNames = ['Crimson Velvet', 'Gilded Rose', 'Midnight Plum', 'Nude Silk'];

        const deleteResult = await Product.deleteMany({
            productName: { $in: mockProductNames },
            brand: 'Veloura'
        });

        console.log(`Deleted ${deleteResult.deletedCount} mock products.`);
        console.log('Product catalog successfully restored!');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
clean();
