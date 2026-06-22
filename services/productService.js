import Product from '../model/Product.js';
import Variant from '../model/Variant.js';
import mongoose from 'mongoose';

export const getProducts = async (options) => {
    try {
        const search = options.search || '';
        const category = options.category || '';
        const brand = options.brand || '';
        const sort = options.sort || 'newest';
        const page = options.page || 1;
        const limit =3 ;

        let matchFilter = {
            isDeleted: false,
            status: 'ACTIVE'
        };

        if (search) {
            matchFilter.productName = { $regex: search, $options: 'i' };
        }
        if (category) {
            matchFilter.categoryId = new mongoose.Types.ObjectId(category);
        }
        if (brand) {
            matchFilter.brand = { $regex: brand, $options: 'i' };
        }

        const skip = (page - 1) * limit;

        const pipeline = [
            { $match: matchFilter }
        ];

        pipeline.push({
            $lookup: {
                from: 'variants',
                let: { productId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$productId', '$$productId'] },
                                    { $eq: ['$isDeleted', false] }
                                ]
                            }
                        }
                    }
                ],
                as: 'variants'
            }
        });

        pipeline.push({
            $lookup: {
                from: 'categories',
                localField: 'categoryId',
                foreignField: '_id',
                as: 'categoryInfo'
            }
        });

        pipeline.push({
            $addFields: {
                categoryId: { $arrayElemAt: ['$categoryInfo', 0] },
                firstVariantPrice: {
                    $let: {
                        vars: { firstVariant: { $arrayElemAt: ['$variants', 0] } },
                        in: { $ifNull: ['$$firstVariant.salePrice', 0] }
                    }
                }
            }
        });

        let sortStage = {};
        if (sort === 'price-low') {
            sortStage = { $sort: { firstVariantPrice: 1 } };
        } else if (sort === 'price-high') {
            sortStage = { $sort: { firstVariantPrice: -1 } };
        } else if (sort === 'name-asc') {
            sortStage = { $sort: { productName: 1 } };
        } else if (sort === 'name-desc') {
            sortStage = { $sort: { productName: -1 } };
        } else {
            sortStage = { $sort: { createdAt: -1 } };
        }
        pipeline.push(sortStage);

        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: limit });

        const products = await Product.aggregate(pipeline).collation({ locale: 'en', strength: 2 });

        const totalProducts = await Product.countDocuments(matchFilter);
        const totalPages = Math.ceil(totalProducts / limit);

        return {
            products: products,
            currentPage: page,
            totalPages: totalPages,
            totalProducts: totalProducts
        };
    } catch (error) {
        console.log('Error getting products:', error);
        throw error;
    }
};

export const getProductById = async (productId) => {
    try {
        const product = await Product.findOne({
            _id: productId,
            isDeleted: false,
            status: 'ACTIVE'
        }).populate('categoryId', 'name');

        if (!product) return null;

        const variants = await Variant.find({
            productId: product._id,
            isDeleted: false
        });

        return {
            ...product.toObject(),
            variants: variants
        };
    } catch (error) {
        console.log('Error getting product:', error);
        throw error;
    }
};

export const checkProductAvailability = async (productId, quantity) => {
    try {
        const product = await Product.findOne({
            _id: productId,
            isDeleted: false,
            status: 'ACTIVE'
        });

        if (!product) {
            return { available: false, message: 'Product not found' };
        }

        const variant = await Variant.findOne({ productId: product._id, isDeleted: false });
        if (!variant || variant.quantity < quantity) {
            return { available: false, message: 'Not enough stock' };
        }

        return { available: true, product: product };
    } catch (error) {
        console.log('Error checking availability:', error);
        throw error;
    }
};

export const getAllCategories = async () => {
    try {
        const Category = (await import('../model/Category.js')).default;
        const categories = await Category.find({ isDeleted: false, isListed: true }).sort({ name: 1 });
        return categories;
    } catch (error) {
        console.log('Error getting categories:', error);
        throw error;
    }
};

export const getAllBrands = async () => {
    try {
        const brands = await Product.distinct('brand', {
            isDeleted: false,
            status: 'ACTIVE'
        });
        return brands;
    } catch (error) {
        console.log('Error getting brands:', error);
        throw error;
    }
};