import * as cartService from '../../services/cartService.js';
import Cart from '../../model/Cart.js';
import Product from '../../model/Product.js';

export const getCartPage = async (req, res) => {
    try {
        const userId = req.session.userId;
        const cart = await cartService.getUserCart(userId);
        res.render('user/cart', { cart });
    } catch (error) {
        console.error('Error in getCartPage:', error);
        res.status(500).render('error/500');
    }
};

// Add product,variant to cart
export const addToCart = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { productId, variantId } = req.body;
        const quantity = parseInt(req.body.quantity) || 1;

   

        if (!productId || !variantId) {
            return res.json({ success: false, message: 'Product and variant are required' });
        }

        const cart = await cartService.addProductToCart(userId, productId, variantId, quantity);

        res.json({ success: true, message: 'Product added to cart', cart });
    } catch (error) {
        console.error('Error in addToCart:', error);
        res.json({ success: false, message: error.message || 'Failed to add to cart' });
    }
};

// Update quantity of a cart item
export const updateQuantity = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { variantId, quantity } = req.body;
        const parsedQuantity = parseInt(quantity);

        const cart = await cartService.updateCartQuantity(userId, variantId, parsedQuantity);

        res.json({ success: true, message: 'Quantity updated', cart });
    } catch (error) {
        console.log('Error in updateQuantity:', error);
        res.json({ success: false, message: error.message });
    }
};

// Remove item from cart
export const removeItem = async (req, res) => {
    try {
        const userId = req.session.userId;
        const variantId = req.params.variantId;

        const cart = await cartService.removeFromCart(userId, variantId);

        res.json({ success: true, message: 'Item removed from cart', cart });
    } catch (error) {
        console.log('Error in removeItem:', error);
        res.json({ success: false, message: error.message });
    }
};

// Get cart count for navbar
export const getCartCount = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.json({ count: 0 });
        }
        const cart = await cartService.getUserCart(req.session.userId);
        const count = cart && cart.items ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
        res.json({ count });
    } catch (error) {
        console.log('Error in getCartCount:', error);
        res.json({ count: 0 });
    }
};