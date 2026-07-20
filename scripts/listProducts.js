import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../model/Product.js';
import Variant from '../model/Variant.js';

dotenv.config();

async function list() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const products = await Product.find({ isDeleted: false });
        console.log(`Found ${products.length} active products:`);
        for (const p of products) {
            const variants = await Variant.find({ product: p._id });
            console.log(`- ID: ${p._id}, Name: "${p.productName}", Brand: "${p.brand}", Variants Count: ${variants.length}`);
            for (const v of variants) {
                console.log(`  * Variant ID: ${v._id}, Color: "${v.color}", Qty: ${v.quantity}, Images: ${JSON.stringify(v.images)}`);
            }
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
list();
