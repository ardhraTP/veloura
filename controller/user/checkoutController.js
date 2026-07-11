import * as cartService from '../../services/cartService.js';
import * as addressService from '../../services/addressService.js';
import Order from '../../model/Order.js';
import Variant from '../../model/Variant.js';
import Cart from '../../model/Cart.js';


export const getCheckoutPage = async (req, res) => {
    try {
        const userId = req.session.userId;

        const cart = await cartService.getUserCart(userId);

        if (!cart || !cart.items || cart.items.length === 0) {
            return res.redirect('/cart');
        }

        // Validate stock availability for all items in the cart
        let hasStockError = false;
        for (const item of cart.items) {
            if (!item.product || item.product.status === 'INACTIVE' || item.product.isDeleted) {
                hasStockError = true;
                req.session.cartError = `Product "${item.product ? item.product.productName : 'Unavailable'}" is no longer available.`;
                break;
            }
            if (!item.variant || item.variant.isDeleted) {
                hasStockError = true;
                req.session.cartError = `Selected variant of "${item.product.productName}" is no longer available.`;
                break;
            }
            if (item.variant.quantity === 0 || item.quantity <= 0) {
                hasStockError = true;
                req.session.cartError = `"${item.product.productName} (${item.variant.color})" is out of stock.`;
                break;
            }
            if (item.variant.quantity < item.quantity) {
                hasStockError = true;
                req.session.cartError = `Only ${item.variant.quantity} items left in stock for "${item.product.productName} (${item.variant.color})".`;
                break;
            }
        }

        if (hasStockError) {
            return res.redirect('/cart');
        }

        const addresses = await addressService.getUserAddresses(userId);


        const subtotal = cart.totalAmount;
        const shippingFee = subtotal > 1000 ? 0 : 50; // free shipping above 1000, else ₹50

        const tax = Math.round(subtotal * 0.05);
        const discount = 0;
        const finalPrice = subtotal + shippingFee + tax - discount;


        res.render('user/checkout', {
            cart,
            addresses,
            subtotal,
            shippingFee,
            tax,
            discount,
            finalPrice,
            isLoggedIn: true
        });
    } catch (error) {
        console.error('Error in getCheckoutPage:', error);
        res.status(500).render('error/500');
    }
};


//cash on delivery
export const placeOrder = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { addressId, paymentMethod, couponCode, discount } = req.body;
        // 1. Fetch user's cart
        const cart = await cartService.getUserCart(userId);
        if (!cart || !cart.items || cart.items.length === 0) {
            return res.json({ success: false, message: 'Your cart is empty' });
        }
        // 2. Fetch delivery address details
        const selectedAddress = await addressService.getAddressById(addressId, userId);
        if (!selectedAddress) {
            return res.json({ success: false, message: 'Selected delivery address not found' });
        }
        // 3. Check stock availability for all items in the cart
        for (const item of cart.items) {
            const variant = await Variant.findById(item.variant._id);
            if (!variant || variant.isDeleted) {
                return res.json({
                    success: false,
                    message: `Product variant not found or unavailable: ${item.product.productName}`
                });
            }
            if (variant.quantity === 0 || item.quantity <= 0) {
                return res.json({
                    success: false,
                    message: `${item.product.productName} (${variant.color}) is out of stock. Please update your cart.`
                });
            }
            if (variant.quantity < item.quantity) {
                return res.json({
                    success: false,
                    message: `Only ${variant.quantity} units left in stock for ${item.product.productName} (${variant.color})`
                });
            }
        }


        //calculate price

        const subtotal = cart.totalAmount;
        const shippingFee = subtotal > 1000 ? 0 : 50;
        const tax = Math.round(subtotal * 0.05);
        const discountAmount = Number(discount) || 0;
        const totalAmount = subtotal + shippingFee + tax - discountAmount;

        const orderId = 'VEL-' + Math.random().toString(36).substring(2, 8).toUpperCase();


        const deliveryAddress = {
            fullName: selectedAddress.fullName,
            phone: selectedAddress.phone,
            address: selectedAddress.address,
            city: selectedAddress.city,
            state: selectedAddress.state,
            pincode: selectedAddress.pincode,
            addressType: selectedAddress.addressType,
        };

        const orderItems = cart.items.map(item => ({
            product: item.product._id,
            variant: item.variant._id,
            quantity: item.quantity,
            price: item.price,
            itemStatus: 'Ordered'
        }));

        const newOrder = new Order({
            user: userId,
            orderId: orderId,
            deliveryAddress: deliveryAddress,
            items: orderItems,
            subtotal: subtotal,
            shippingFee: shippingFee,
            discount: discountAmount,
            tax: tax,
            totalAmount: totalAmount,
            paymentMethod: paymentMethod || 'COD',
            paymentStatus: 'Pending',
            orderStatus: 'Pending'
        });

        await newOrder.save();


        for (const item of cart.items) {
            await Variant.findByIdAndUpdate(item.variant._id, {
                $inc: { quantity: -item.quantity }
            });
        }

        cart.items = [];
        cart.totalAmount = 0;
        await cart.save();

        res.json({
            success: true,
            message: 'Order placed successfully!',
            orderId: newOrder.orderId
        });
    } catch (error) {
        console.error('Error in placeOrder controller:', error);
        res.json({ success: false, message: 'Server error while placing order.Please try again.' });
    }
};