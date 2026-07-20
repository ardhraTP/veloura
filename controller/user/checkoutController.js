import * as cartService from '../../services/cartService.js';
import * as orderService from '../../services/orderService.js';
import * as couponService from '../../services/couponService.js';
import * as addressService from '../../services/addressService.js';
import Order from '../../model/Order.js';
import Variant from '../../model/Variant.js';
import User from '../../model/User.js';
import razorpayInstance from '../../config/razorpay.js';
import crypto from 'crypto';


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
            if (!item.variant || item.variant.isDeleted || item.variant.status === 'INACTIVE') {
                hasStockError = true;
                req.session.cartError = `Selected shade of "${item.product.productName}" is no longer available.`;
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

        // Get user wallet balance
        const user = await User.findById(userId);

        const activeCoupons = await couponService.getActiveCoupons();

        const subtotal = cart.totalAmount;
        const shippingFee = subtotal > 1000 ? 0 : 50;
        const tax = Math.round(subtotal * 0.05);
        const discount = 0;
        const finalPrice = subtotal + shippingFee + tax - discount;

        res.render('user/checkout', {
            user,
            cart,
            addresses,
            subtotal,
            shippingFee,
            tax,
            discount,
            finalPrice,
            walletBalance: user.walletBalance || 0,
            activeCoupons,
            isLoggedIn: true
        });
    } catch (error) {
        console.error('Error in getCheckoutPage:', error);
        res.status(500).render('error/500');
    }
};

// Apply coupon
export const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const userId = req.session.userId;

        // Get cart
        const cart = await cartService.getUserCart(userId);
        const cartTotal = cart.totalAmount;

        // Validate coupon
        const result = await couponService.validateCoupon(
            couponCode,
            userId,
            cartTotal,
            cart.items
        );

        if (!result.valid) {
            return res.json({
                success: false,
                message: result.message
            });
        }

        // Store coupon in session
        req.session.appliedCoupon = {
            code: result.coupon.code,
            discountAmount: result.discountAmount,
            couponId: result.coupon._id
        };

        res.json({
            success: true,
            message: 'Coupon applied successfully',
            discountAmount: result.discountAmount,
            finalAmount: cartTotal - result.discountAmount,
            coupon: {
                code: result.coupon.code,
                discountType: result.coupon.discountType,
                discountValue: result.coupon.discountValue,
                minOrderAmount: result.coupon.minOrderAmount,
                maxDiscountAmount: result.coupon.maxDiscountAmount,
                description: result.coupon.description
            }
        });

    } catch (error) {
        console.error('Error applying coupon:', error);
        res.json({
            success: false,
            message: 'Failed to apply coupon'
        });
    }
};

// Remove coupon
export const removeCoupon = async (req, res) => {
    try {
        // Remove coupon from session
        req.session.appliedCoupon = null;

        res.json({
            success: true,
            message: 'Coupon removed successfully'
        });

    } catch (error) {
        console.error('Error removing coupon:', error);
        res.json({
            success: false,
            message: 'Failed to remove coupon'
        });
    }
};


export const createOrder = async (req,res)=>{
    try{
        const userId = req.session.userId;
        const {addressId,paymentMethod,couponCode,discount} = req.body;

        const cart = await cartService.getUserCart(userId);
        if(!cart || !cart.items || cart.items.length === 0){
            return res.json({success:false, message:'Your cart is empty'});
        }

        // Get address
        const selectedAddress = await addressService.getAddressById(addressId, userId);
        if (!selectedAddress) {
            return res.json({ success: false, message: 'Address not found' });
        }

        for(const item of cart.items){
            const variant = await Variant.findById(item.variant._id);
            if(!variant || variant.quantity < item.quantity){
                return res.json({
                    success:false,
                    message:`Insufficient stock for  ${item.product.productName} `
                });
            }
        }

        const subtotal = cart.totalAmount;
        const shippingFee = subtotal > 1000 ? 0 : 50;
        const tax = Math.round(subtotal * 0.05);

        let discountAmount = 0;
        if (couponCode) {
            const couponResult = await couponService.validateCoupon(
                couponCode,
                userId,
                subtotal,
                cart.items
            );
            if (!couponResult.valid) {
                return res.json({ success: false, message: couponResult.message });
            }
            discountAmount = couponResult.discountAmount;
        }

        const totalAmount = subtotal + shippingFee + tax - discountAmount;


        const orderId = 'VEL-' + Math.random().toString(36).substring(2,8).toUpperCase();

        const deliveryAddress = {
            fullName: selectedAddress.fullName,
            phone: selectedAddress.phone,
            address: selectedAddress.address,
            city: selectedAddress.city,
            state: selectedAddress.state,
            pincode: selectedAddress.pincode,
            addressType: selectedAddress.addressType
        };

        const orderItems = cart.items.map(item=>({
            product: item.product._id,
            variant: item.variant._id,
            quantity: item.quantity,
            price: item.price,
            itemStatus: 'Ordered'
        }));

        const newOrder = new Order({
            user:userId,
            orderId: orderId,
            deliveryAddress: deliveryAddress,
            items: orderItems,
            subtotal: subtotal,
            shippingFee: shippingFee,
            discount: discountAmount,
            tax:tax,
            totalAmount: totalAmount,
            paymentMethod: 'Online',
            paymentStatus: 'Pending',
            orderStatus: 'Pending',
            coupon: couponCode ? {code: couponCode,discountAmount: discountAmount} : null
        });

        await newOrder.save();

        const razorpayOrder = await razorpayInstance.orders.create({
            amount: Math.round(totalAmount * 100),
            currency: 'INR',
            receipt: orderId,
            notes:{
                orderId: orderId,
                userId: userId.toString()
            }
        });

        newOrder.razorpayOrderId = razorpayOrder.id;
        await newOrder.save();

        res.json({
            success:true,
            orderId: newOrder.orderId,
            razorpayOrderId: razorpayOrder.id,
            amount: totalAmount * 100,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID,
            currency: 'INR'
        });

    }catch(error){
        console.error('Error creating Razorpay order:',error);
        res.json({
            success:false,
            message:'Failed to create order'
        });
    }
};

// // Place order
// export const placeOrder = async (req, res) => {
//     try {
//         const userId = req.session.userId;
//         const { addressId, paymentMethod } = req.body;

//         const cart = await cartService.getUserCart(userId);
//         if (!cart || !cart.items || cart.items.length === 0) {
//             return res.json({ success: false, message: 'Your cart is empty' });
//         }

//         const selectedAddress = await addressService.getAddressById(addressId, userId);
//         if (!selectedAddress) {
//             return res.json({ success: false, message: 'Selected delivery address not found' });
//         }

//         // Validate stock for all items
//         for (const item of cart.items) {
//             if (!item.product || item.product.status === 'INACTIVE' || item.product.isDeleted) {
//                 return res.json({
//                     success: false,
//                     message: `Product "${item.product ? item.product.productName : 'Unavailable'}" is no longer available.`
//                 });
//             }

//             const variant = await Variant.findById(item.variant._id);
//             if (!variant || variant.isDeleted || variant.status === 'INACTIVE') {
//                 return res.json({
//                     success: false,
//                     message: `Selected shade of "${item.product.productName}" is no longer available.`
//                 });
//             }

//             if (variant.quantity === 0 || item.quantity <= 0) {
//                 return res.json({
//                     success: false,
//                     message: `"${item.product.productName} (${variant.color})" is out of stock.`
//                 });
//             }
//             if (variant.quantity < item.quantity) {
//                 return res.json({
//                     success: false,
//                     message: `Only ${variant.quantity} units left for "${item.product.productName} (${variant.color})".`
//                 });
//             }
//         }

//         // Calculate amounts
//         const subtotal = cart.totalAmount;
//         let discount = 0;
//         let couponData = null;

//         // Apply coupon if exists
//         if (req.session.appliedCoupon) {
//             discount = req.session.appliedCoupon.discountAmount;
//             couponData = {
//                 code: req.session.appliedCoupon.code,
//                 discountAmount: discount
//             };
//         }

//         const shippingFee = subtotal > 1000 ? 0 : 50;
//         const tax = Math.round(subtotal * 0.05);
//         const totalAmount = subtotal + shippingFee + tax - discount;

//         const orderId = 'VEL-' + Math.random().toString(36).substring(2, 8).toUpperCase();

//         const deliveryAddress = {
//             fullName: selectedAddress.fullName,
//             phone: selectedAddress.phone,
//             address: selectedAddress.address,
//             city: selectedAddress.city,
//             state: selectedAddress.state,
//             pincode: selectedAddress.pincode,
//             addressType: selectedAddress.addressType
//         };

//         const orderItems = cart.items.map(item => ({
//             product: item.product._id,
//             variant: item.variant._id,
//             quantity: item.quantity,
//             price: item.price,
//             itemStatus: 'Ordered'
//         }));

//         const newOrder = new Order({
//             user: userId,
//             orderId: orderId,
//             deliveryAddress: deliveryAddress,
//             items: orderItems,
//             subtotal: subtotal,
//             shippingFee: shippingFee,
//             discount: discount,
//             tax: tax,
//             totalAmount: totalAmount,
//             paymentMethod: paymentMethod || 'COD',
//             paymentStatus: 'Pending',
//             orderStatus: 'Pending',
//             coupon: couponData
//         });

//         await newOrder.save();

//         // Decrease stock
//         for (const item of cart.items) {
//             await Variant.findByIdAndUpdate(item.variant._id, {
//                 $inc: { quantity: -item.quantity }
//             });
//         }

//         // If coupon applied, increment usage
//         if (req.session.appliedCoupon) {
//             await couponService.applyCoupon(req.session.appliedCoupon.code);
//             req.session.appliedCoupon = null;
//         }

//         // Handle different payment methods
//         if (paymentMethod === 'COD') {
//             // Clear cart
//             cart.items = [];
//             cart.totalAmount = 0;
//             await cart.save();

//             return res.json({
//                 success: true,
//                 message: 'Order placed successfully',
//                 orderId: newOrder.orderId,
//                 paymentMethod: 'COD'
//             });
//         } else if (paymentMethod === 'Online') {
//             // Create Razorpay order
//             const razorpayOrder = await razorpayInstance.orders.create({
//                 amount: Math.round(totalAmount * 100),
//                 currency: 'INR',
//                 receipt: newOrder.orderId,
//                 notes: {
//                     orderId: newOrder.orderId
//                 }
//             });

//             // Update order with Razorpay order ID
//             newOrder.razorpayOrderId = razorpayOrder.id;
//             await newOrder.save();

//             return res.json({
//                 success: true,
//                 message: 'Razorpay order created',
//                 orderId: newOrder.orderId,
//                 razorpayOrderId: razorpayOrder.id,
//                 amount: totalAmount,
//                 keyId: process.env.RAZORPAY_KEY_ID,
//                 paymentMethod: 'Online'
//             });
//         } else if (paymentMethod === 'Wallet') {
//             const user = await User.findById(userId);

//             if (user.walletBalance < totalAmount) {
//                 return res.json({
//                     success: false,
//                     message: 'Insufficient wallet balance'
//                 });
//             }

//             // Deduct from wallet
//             user.walletBalance -= totalAmount;
//             user.walletHistory.push({
//                 amount: totalAmount,
//                 type: 'Debited',
//                 description: `Payment for order ${newOrder.orderId}`,
//                 date: new Date()
//             });
//             await user.save();

//             // Update order
//             newOrder.paymentStatus = 'Completed';
//             newOrder.orderStatus = 'Processing';
//             await newOrder.save();

//             // Clear cart
//             cart.items = [];
//             cart.totalAmount = 0;
//             await cart.save();

//             return res.json({
//                 success: true,
//                 message: 'Order placed successfully with wallet',
//                 orderId: newOrder.orderId,
//                 paymentMethod: 'Wallet'
//             });
//         }

//     } catch (error) {
//         console.error('Error in placeOrder controller:', error);
//         res.json({ success: false, message: 'Server error while placing order' });
//     }
// };


// Place order (COD and Wallet only)
export const placeOrder = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { addressId, paymentMethod, couponCode, discount } = req.body;

        // Validate payment method
        if (paymentMethod !== 'COD' && paymentMethod !== 'Wallet') {
            return res.json({
                success: false,
                message: 'Invalid payment method'
            });
        }

        // Get cart
        const cart = await cartService.getUserCart(userId);
        if (!cart || !cart.items || cart.items.length === 0) {
            return res.json({ success: false, message: 'Your cart is empty' });
        }

        // Get address
        const selectedAddress = await addressService.getAddressById(addressId, userId);
        if (!selectedAddress) {
            return res.json({ success: false, message: 'Address not found' });
        }

        // Validate stock
        for (const item of cart.items) {
            const variant = await Variant.findById(item.variant._id);
            if (!variant || variant.quantity < item.quantity) {
                return res.json({
                    success: false,
                    message: `Insufficient stock for ${item.product.productName}`
                });
            }
        }

        // Calculate amounts
        const subtotal = cart.totalAmount;
        const shippingFee = subtotal > 1000 ? 0 : 50;
        const tax = Math.round(subtotal * 0.05);

        let discountAmount = 0;
        if (couponCode) {
            const couponResult = await couponService.validateCoupon(
                couponCode,
                userId,
                subtotal,
                cart.items
            );
            if (!couponResult.valid) {
                return res.json({ success: false, message: couponResult.message });
            }
            discountAmount = couponResult.discountAmount;
        }

        const totalAmount = subtotal + shippingFee + tax - discountAmount;

        // For Wallet payment, check balance
        if (paymentMethod === 'Wallet') {
            const user = await User.findById(userId);
            if (user.walletBalance < totalAmount) {
                return res.json({
                    success: false,
                    message: 'Insufficient wallet balance'
                });
            }
        }

        // Generate order ID
        const orderId = 'VEL-' + Math.random().toString(36).substring(2, 8).toUpperCase();

        // Create order
        const deliveryAddress = {
            fullName: selectedAddress.fullName,
            phone: selectedAddress.phone,
            address: selectedAddress.address,
            city: selectedAddress.city,
            state: selectedAddress.state,
            pincode: selectedAddress.pincode,
            addressType: selectedAddress.addressType
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
            paymentMethod: paymentMethod,
            paymentStatus: paymentMethod === 'Wallet' ? 'Completed' : 'Pending',
            orderStatus: paymentMethod === 'Wallet' ? 'Processing' : 'Pending',
            coupon: couponCode ? { code: couponCode, discountAmount: discountAmount } : null
        });

        await newOrder.save();

        // Decrease stock
        for (const item of cart.items) {
            await Variant.findByIdAndUpdate(item.variant._id, {
                $inc: { quantity: -item.quantity }
            });
        }

        // Handle Wallet payment
        if (paymentMethod === 'Wallet') {
            const user = await User.findById(userId);
            user.walletBalance -= totalAmount;
            user.walletHistory.push({
                amount: totalAmount,
                type: 'Debited',
                description: `Payment for order ${orderId}`,
                date: new Date()
            });
            await user.save();
        }

        // Apply coupon if exists
        if (couponCode) {
            await couponService.applyCoupon(couponCode);
        }

        // Clear cart
        cart.items = [];
        cart.totalAmount = 0;
        await cart.save();

        res.json({
            success: true,
            message: 'Order placed successfully',
            orderId: newOrder.orderId
        });

    } catch (error) {
        console.error('Error placing order:', error);
        res.json({
            success: false,
            message: 'Failed to place order'
        });
    }
};


// Verify Razorpay payment
export const verifyPayment = async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpayOrderId, 
            razorpay_payment_id, 
            razorpayPaymentId, 
            razorpay_signature, 
            razorpaySignature, 
            orderId 
        } = req.body;

        const activeOrderId = razorpay_order_id || razorpayOrderId;
        const activePaymentId = razorpay_payment_id || razorpayPaymentId;
        const activeSignature = razorpay_signature || razorpaySignature;

        // Verify signature
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(activeOrderId + '|' + activePaymentId)
            .digest('hex');

        if (generatedSignature !== activeSignature) {
            return res.json({
                success: false,
                message: 'Payment verification failed'
            });
        }

        // Update order
        const order = await Order.findOne({ orderId: orderId, user: req.session.userId });
        if (!order) {
            return res.json({
                success: false,
                message: 'Order not found'
            });
        }

        order.razorpayPaymentId = activePaymentId;
        order.razorpaySignature = activeSignature;
        order.paymentStatus = 'Completed';
        order.orderStatus = 'Processing';
        await order.save();

        // Decrease stock on successful payment
        for (const item of order.items) {
            await Variant.findByIdAndUpdate(item.variant, {
                $inc: { quantity: -item.quantity }
            });
        }

        // Apply coupon on successful payment
        if (order.coupon && order.coupon.code) {
            await couponService.applyCoupon(order.coupon.code);
        }

        // Clear cart
        await orderService.clearUserCart(req.session.userId);

        res.json({
            success: true,
            message: 'Payment verified successfully',
            orderId: order.orderId
        });

    } catch (error) {
        console.error('Error verifying payment:', error);
        res.json({
            success: false,
            message: 'Payment verification failed'
        });
    }
};

// Handle payment failed
export const paymentFailed = async (req, res) => {
    try {
        const { orderId } = req.body;

        const order = await Order.findOne({ orderId: orderId, user: req.session.userId });
        if (order) {
            order.paymentStatus = 'Failed';
            order.orderStatus = 'Cancelled';
            await order.save();
        }

        res.json({
            success: true,
            message: 'Payment failure recorded'
        });

    } catch (error) {
        console.error('Error handling payment failure:', error);
        res.json({
            success: false,
            message: 'Failed to record payment failure'
        });
    }
};