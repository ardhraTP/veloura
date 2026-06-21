import Cart from '../model/Cart.js';
import Product from '../model/Product.js';
import Variant from '../model/Variant.js';
import { removeFromWishlist } from './wishlistService.js';

// ── Get (or create) a user's cart ───────────────────────────────────────────
export const getUserCart = async (userId) => {
    try {
        let cart = await Cart.findOne({ user: userId })
            .populate('items.product')
            .populate('items.variant');

        if (!cart) {
            cart = new Cart({ user: userId, items: [], totalAmount: 0 });
            await cart.save();
        }
        return cart;
    } catch (error) {
        console.log('Error getting cart:', error);
        throw error;
    }
};

// ── Add a product+variant to cart ────────────────────────────────────────────
export const addProductToCart = async (userId, productId, variantId, quantity) => {
    try {
        // Validate product is active
        const product = await Product.findOne({
            _id: productId,
            isDeleted: false,
            status: 'ACTIVE'
        });
        if (!product) throw new Error('Product not found or unavailable');

        // Validate variant exists and has enough stock
        const variant = await Variant.findOne({
            _id: variantId,
            productId: productId,
            isDeleted: false
        });
        if (!variant) throw new Error('Variant not found');
        if (variant.quantity < quantity) throw new Error('Not enough stock available');

        const priceToUse = variant.salePrice;

        let cart = await getUserCart(userId);

        // Check if the same variant is already in the cart
        const existingItem = cart.items.find(item => {
            if (!item.variant) return false;
            const itemVarId = item.variant._id ? item.variant._id.toString() : item.variant.toString();
            return itemVarId === variantId.toString();
        });

        if (existingItem) {
            const newQuantity = existingItem.quantity + quantity;
            if (newQuantity > 5) {
                throw new Error('Cannot add more than 5 quantity of the same product variant');
            }
            if (variant.quantity < newQuantity) {
                throw new Error('Not enough stock available');
            }
            existingItem.quantity = newQuantity;
        } else {
            if (quantity > 5) {
                throw new Error('Cannot add more than 5 quantity of the same product variant');
            }
            cart.items.push({
                product: productId,
                variant: variantId,
                quantity: quantity,
                price: priceToUse
            });
        }

        cart.totalAmount = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        await cart.save();

        try {
            await removeFromWishlist(userId, productId);
        } catch (e) {
        }

        cart = await Cart.findById(cart._id).populate('items.product').populate('items.variant');
        return cart;
    } catch (error) {
        console.log('Error adding to cart:', error);
        throw error;
    }
};

export const updateCartQuantity = async (userId, variantId, newQuantity) => {
    try {
        if (newQuantity < 1) throw new Error('Quantity must be at least 1');
        if (newQuantity > 5) throw new Error('Cannot add more than 5 quantity of the same product variant');

        let cart = await getUserCart(userId);

        const item = cart.items.find(item => {
            if (!item.variant) return false;
            const itemVarId = item.variant._id ? item.variant._id.toString() : item.variant.toString();
            return itemVarId === variantId;
        });
        if (!item) throw new Error('Product not in cart');

        // Check stock via variant if available
        if (item.variant) {
            const variant = await Variant.findById(item.variant._id);
            if (variant && variant.quantity < newQuantity) {
                throw new Error('Not enough stock available');
            }
        }

        item.quantity = newQuantity;
        cart.totalAmount = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        await cart.save();

        cart = await Cart.findById(cart._id).populate('items.product').populate('items.variant');
        return cart;
    } catch (error) {
        console.log('Error updating quantity:', error);
        throw error;
    }
};

// ── Remove an item from cart ─────────────────────────────────────────────────
export const removeFromCart = async (userId, variantId) => {
    try {
        let cart = await getUserCart(userId);

        cart.items = cart.items.filter(item => {
            if (!item.variant) return false;
            const itemVarId = item.variant._id ? item.variant._id.toString() : item.variant.toString();
            return itemVarId !== variantId;
        });

        cart.totalAmount = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        await cart.save();

        cart = await Cart.findById(cart._id).populate('items.product').populate('items.variant');
        return cart;
    } catch (error) {
        console.log('Error removing from cart:', error);
        throw error;
    }
};
