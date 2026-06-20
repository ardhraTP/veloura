import Product from '../model/Product.js';

export const getProducts = async (options) => {
    try {
        const search = options.search || '';
        const category = options.category || '';
        const brand = options.brand || '';
        const sort = options.sort || 'newest';
        const page = options.page || 1;
        const limit = 9;

        let filter = {
            isBlocked: false,
            isListed: true
        };

        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }
        if (category) {
            filter.category = category;
        }
        if (brand) {
            filter.brand = brand;
        }

        let sortOption = {};
        if (sort === 'price-low') {
            sortOption = { price: 1 };
        } else if (sort === 'price-high') {
            sortOption = { price: -1 };
        } else if (sort === 'name-asc') {
            sortOption = { name: 1 };
        } else if (sort === 'name-desc') {
            sortOption = { name: -1 };
        } else {
            sortOption = { createdAt: -1 };  //newest first
        }

        const skip = (page - 1) * limit;

        const products = await Product.find(filter)
            .sort(sortOption)
            .skip(skip)
            .limit(limit);

        const totalProducts = await Product.countDocuments(filter);
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


//function to get single product by ID
export const getProductById = async (productId) => {
    try {
        const product = await Product.findById(productId);
        return product;
    } catch (error) {
        console.log('Error getting product:', error);
    }
};

//to chech if product is available
export const checkProductAvailability = async (productId, quantity) => {
    try {

        const product = await Product.findById(productId);

        if (!product) {
            return { available: false, message: 'Product not found' };
        }
        if (product.isBlocked) {
            return { available: false, message: 'Product is not available' };
        }
        if (!product.isListed) {
            return { available: false, message: 'Product is not available' };
        }
        if (product.stock < quantity) {
            return { available: false, message: 'Not enough stock' };
        }

        return {available:true,product:product};
    }catch(error){
        console.log('Error checking availability:',error);
        throw error;
    }
};

//to get all categories
export const getAllCategories = async()=>{
    try{
        const categories = await Product.distinct('category',{
            isBlocked:false,
            isListed:true
        });
        return categories;
    }catch(error){
        console.log('Error getting categories:',error);
        throw error;
    }
};

//to get all brands
export const getAllBrands = async ()=>{
    try{
        const brands = await Product.distinct('brand',{
            isBlocked:false,
            isListed:true
        });
        return brands;
    }catch(error){
        console.log('Error getting brands:',error);
        throw error;
    }
};