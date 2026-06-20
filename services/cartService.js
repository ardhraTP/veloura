import Cart from '../model/Cart.js';
import {checkProductAvailability} from './productService.js';
import { removeFromWishlist} from './wishlistService.js';

//get users cart
export const getUserCart = async (userId)=>{
    try{
        let cart = await Cart.findOne({user:userId})
        .populate('items.product');

        if(!cart){
            cart = new Cart({
                user:userId,
                items:[],
                totalAmount:0
            });
            await cart.save();
        }
        return cart;
    }catch(error){
        console.log('Error getting cart:',error);
        throw error;
    }
};

//add product to cart
export const addProductToCart = async (userId,productId,quantity)=>{
    try{
        const check = await checkProductAvailability(productId,quantity);

        if(!check.available){
            throw new Error(check.message);
        }

        const product = check.product;

        let cart = await getUsersCart(userId);

        const existingItem = cart.items.find(
            item=>item.product._id.toString() === productId
        );

        if(existingItem){
            const newQuantity = existingItem.quantity + quantity;

            const stockCheck = await checkProductAvailability(productId,newQuantity);
            if(!stockCheck.available){
                throw new Error('Not enough stock available');
            }
            existingItem.quantity = newQuantity;
        }else{
            //add new item to cart
            const priceToUse = product.discountPrice || product.price;
            cart.items.push({
                product:productId,
                quantity:quantity,
                price:priceToUse
            });
        }

        cart.totalAmount = 0;
        for(let item of cart.items){
            cart.totalAmount += item.price * item.quantity;
        }
        await cart.save();

        //remove from wishlist when added to cart
        try {
            await removeFromWishlist(userId, productId);
        } catch (wishlistError) {
            // if product not in wishlis
            console.log('Product not in wishlist or error removing:', wishlistError.message);
        }

        cart = await Cart.findById(cart._id).populate('items.product');
        return cart;
    }catch(error){
        console.log('Error adding to cart:',error);
        throw error;
    }
};

//update item quantity in cart
export const updateCartQuantity = async (userId,productId,newQuantity)=>{
    try{
        if(newQuantity < 1){
            throw new Error('Quantity must be at least 1');
        }

        //check if the product is available in this quantity
        const check = await checkProductAvailability(productId,newQuantity);
        if(!check.available){
            throw new Error(check.message);
        }

        let cart = await getUsersCart(userId);

        const item = cart.items.find(
            item=>item.product._id.toString() === productId
        );

        if(!item){
            throw new Error('Product not in cart');
        }

        item.quantity = newQuantity;

        cart.totalAmount = 0;
        for(let item of cart.items){
            cart.totalAmount += item.price * item.quantity;
        }

        await cart.save();

        cart = await Cart.findById(cart._id).populate('items.product');
        return cart;
    }catch(error){
        console.log('Error updating quantity:',error);
        throw error;
    }
};

//remove items from cart
export const removeFromCart = async(userId,productId)=>{
    try{
        let cart = await getUsersCart(userId);

        cart.items = cart.items.filter(
            item => item.product._id.toString() !== productId
        );

        cart.totalAmount = 0;
        for(let item of cart.items){
            cart.totalAmount += item.price * item.quantity;
        }

        await cart.save();

        cart = await Cart.findById(cart._id).populate('items.product');
        return cart;
    }catch(error){
        console.log('Error removing from cart:',error);
        throw error;
    }
};
