// Script to add sample products to the database
// Run this with: node scripts/addSampleProducts.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../model/Product.js';

dotenv.config();

// Sample products data
const sampleProducts = [
    {
        name: 'Retro Matte Lipstick',
        description: 'Intense color in a matte finish. Goes on creamy, dries matte with vibrant, full-coverage color.',
        brand: 'MAC',
        category: 'Lipstick',
        price: 2100,
        discountPrice: 1890,
        stock: 50,
        images: ['/images/mac_product.png'],
        isBlocked: false,
        isListed: true
    },
    {
        name: 'SuperStay Matte Ink',
        description: 'Liquid lipstick that lasts up to 16 hours with a bold matte finish.',
        brand: 'Maybelline',
        category: 'Lipstick',
        price: 650,
        discountPrice: 550,
        stock: 75,
        images: ['/images/maybelline_product.png'],
        isBlocked: false,
        isListed: true
    },
    {
        name: '9to5 Primer + Matte',
        description: 'Transfer-proof lipstick with high-intensity color and a velvety matte finish.',
        brand: 'Lakme',
        category: 'Lipstick',
        price: 475,
        stock: 100,
        images: ['/images/lakme_product.png'],
        isBlocked: false,
        isListed: true
    },
    {
        name: 'Ruby Woo',
        description: 'Iconic blue-red shade with retro matte finish.',
        brand: 'MAC',
        category: 'Lipstick',
        price: 2100,
        stock: 30,
        images: ['/images/products_mac_1.png'],
        isBlocked: false,
        isListed: true
    },
    {
        name: 'Color Sensational Vivids',
        description: 'Bold, vivid color in one smooth swipe.',
        brand: 'Maybelline',
        category: 'Lipstick',
        price: 399,
        stock: 60,
        images: ['/images/products_maybelline_1.png'],
        isBlocked: false,
        isListed: true
    },
    {
        name: 'Absolute Argan Oil Lip Color',
        description: 'Enriched with argan oil for nourished, moisturized lips.',
        brand: 'Lakme',
        category: 'Lipstick',
        price: 575,
        discountPrice: 489,
        stock: 40,
        images: ['/images/products_lakme_1.png'],
        isBlocked: false,
        isListed: true
    }
];

// Connect to database and add products
async function addProducts() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        // Clear existing products (optional)
        await Product.deleteMany({});
        console.log('Cleared existing products');
        
        // Add sample products
        const result = await Product.insertMany(sampleProducts);
        console.log(`Added ${result.length} products successfully`);
        
        // Display added products
        result.forEach(product => {
            console.log(`- ${product.name} (${product.brand}) - ₹${product.price}`);
        });
        
        console.log('\nSample products added successfully!');
        process.exit(0);
        
    } catch (error) {
        console.error('Error adding products:', error);
        process.exit(1);
    }
}

// Run the function
addProducts();
