import Wishlist from '../model/Wishlist.js';
import {checkProductAvailability} from './productService.js';

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
        return wishlist;
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

        let wishlist = await getUserWishlist(userId);

        const alreadyExists = wishlist.products.some(
            product => product._id.toString() === productId 
        );

        if(alreadyExists){
            throw new Error('Product already in wishlist');
        }

        wishlist.products.push(productId);
        await wishlist.save();

        wishlist = await Wishlist.findById(wishlist._id).populate('products');

        return wishlist;
    }catch(error){
        console.log('Error adding to wishlist:',error);
        throw error;
    }
};


//remove from wishlist
export const removeFromWishlist = async (userId,productId)=>{
    try{
        let wishlist = await getUserWishlist(userId);

        wishlist.products = wishlist.products.filter(
            product => product._id.toString() !== productId
        );

        await wishlist.save();

        wishlist = await Wishlist.findById(wishlist._id).populate('products');
        return wishlist;
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
            product => product.toString() === productId 
        );
    }catch(error){
        console.log('Error checking wishlist:',error);
        return false;
    }
};