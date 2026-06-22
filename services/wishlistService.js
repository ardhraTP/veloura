import Wishlist from '../model/Wishlist.js';
import {checkProductAvailability} from './productService.js';
import Variant from '../model/Variant.js';

const populateWishlistVariants = async (wishlist) => {
    if (!wishlist) return null;
    
    const productsWithVariants = await Promise.all(
        wishlist.products.map(async (product) => {
            if (!product) return null;
            const variants = await Variant.find({
                productId: product._id,
                isDeleted: false
            });
            return {
                ...product.toObject(),
                variants: variants
            };
        })
    );

    return {
        ...wishlist.toObject(),
        products: productsWithVariants.filter(Boolean)
    };
};

export const getUserWishlist = async (userId)=>{
    try{
        let wishlist = await Wishlist.findOne({user:userId})
        .populate('products');

        if(!wishlist){
            wishlist = new Wishlist({
                user:userId,
                products:[]
            });
            await wishlist.save();
        }
        return await populateWishlistVariants(wishlist);
    }catch(error){
        console.log('Error getting wishlist:',error);
        throw error;
    }
};

//add product to wishlist
export const addToWishlist = async(userId,productId)=>{
    try{
        const check = await checkProductAvailability(productId,1);

        if(!check.available){
            throw new Error(check.message);
        }

        let wishlist = await Wishlist.findOne({user:userId});
        if(!wishlist){
            wishlist = new Wishlist({
                user:userId,
                products:[]
            });
            await wishlist.save();
        }

        const alreadyExists = wishlist.products.some(
            p => p.toString() === productId 
        );

        if(alreadyExists){
            throw new Error('Product already in wishlist');
        }

        wishlist.products.push(productId);
        await wishlist.save();

        wishlist = await Wishlist.findById(wishlist._id).populate('products');

        return await populateWishlistVariants(wishlist);
    }catch(error){
        console.log('Error adding to wishlist:',error);
        throw error;
    }
};


//remove from wishlist
export const removeFromWishlist = async (userId,productId)=>{
    try{
        let wishlist = await Wishlist.findOne({user:userId});
        if (wishlist) {
            wishlist.products = wishlist.products.filter(
                p => p.toString() !== productId
            );
            await wishlist.save();
        }

        wishlist = await Wishlist.findOne({user:userId}).populate('products');
        return await populateWishlistVariants(wishlist);
    }catch(error){
        console.log('Error removing from wishlist:',error);
        throw error;
    }
};


//check if in product in wishlist
export const isInWishlist = async (userId,productId)=>{
    try{
        const wishlist = await Wishlist.findOne({user:userId});

        if(!wishlist){
            return false;
        }

        return wishlist.products.some(
            p => p.toString() === productId 
        );
    }catch(error){
        console.log('Error checking wishlist:',error);
        return false;
    }
};