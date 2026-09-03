import express from 'express';
import { isAuthenticated, isGuest } from '../middleware/userAuth.js';
import { upload } from '../middleware/upload.js';
import passport from 'passport';
import { getCheckoutPage,applyCoupon,removeCoupon,createOrder,placeOrder,verifyPayment,paymentFailed } from '../controller/user/checkoutController.js';
import { getUserOrders, getOrderDetails, cancelOrderProduct, returnOrderProduct, downloadInvoice,getPaymentSuccess,getPaymentFailed,retryPayment,submitProductReview } from '../controller/user/orderContoller.js';
import Order from '../model/Order.js';



import {
    getSignup,
    signup,
    getLogin,
    login,
    getOTPVerify,
    verifyOTP,
    resendOTP,
    getForgotPassword,
    forgotPassword,
    getResetPassword,
    resetPassword,
    logout,
    getLandingPage,
    getHomePage,
    getAboutPage,
    getContactPage,
    submitContactForm,
    googleAuthCallback
} from '../controller/authController.js';

import {
    getProfile,
    getEditProfile,
    updateProfile,
    uploadProfileImage,
    changePassword,
    startEmailChange,
    getChangeEmailForm,
    processChangeEmailForm,
    getVerifyNewEmailOTP,
    verifyNewEmailOTP,
    resendNewEmailOTP,
    getChangePasswordPage,
    getWalletPage,
    addMoneyToWallet
} from '../controller/user/profileController.js';

import {
    getAddresses,
    getAddAddress,
    addAddress,
    getEditAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
} from '../controller/user/addressController.js';

import {
    getProductsPage,
    getProductDetail
} from '../controller/user/productController.js';

import {
    getCartPage,
    addToCart,
    updateQuantity,
    removeItem,
    getCartCount
} from '../controller/user/cartController.js';
import { isAdminAuthenticated } from '../middleware/adminAuth.js';

import {
    getWishlistPage,
    addToWishlist,
    removeFromWishlist,
    getWishlistCount
} from '../controller/user/wishlistController.js';
import User from '../model/User.js';
import Address from '../model/Address.js';
import Cart from '../model/Cart.js';
import { updateCartQuantity } from '../services/cartService.js';



const router = express.Router();

console.log('UserRoutes module loaded');

router.get('/', getLandingPage);

router.get('/home', isAuthenticated, getHomePage);

router.get('/about', getAboutPage);
router.get('/contact', getContactPage);
router.post('/contact', submitContactForm);

router.get('/products', getProductsPage);
router.get('/product/:id', getProductDetail);

//cart routes
router.get('/cart', isAuthenticated, getCartPage);
router.post('/cart/add', isAuthenticated, addToCart);
router.post('/cart/update', isAuthenticated, updateQuantity);
router.delete('/cart/remove/:variantId', isAuthenticated, removeItem);


router.get('/checkout', isAuthenticated, getCheckoutPage);

router.post('/order/place', isAuthenticated, placeOrder);

router.get('/order/success', isAuthenticated, async (req, res) => {
    try {
        const orderId = req.query.orderId;
        const order = await Order.findOne({ orderId: orderId })
            .populate('items.product')
            .populate('items.variant');
        res.render('user/order-success', {
            order: order,
            orderId: orderId || '_HY252711',
            isLoggedIn: true
        });
    } catch (error) {
        console.error('Error fetching order for success page:', error);
        res.render('user/order-success', {
            order: null,
            orderId: req.query.orderId || '_HY252711',
            isLoggedIn: true
        });
    }
});

router.get('/order/failed', isAuthenticated, async (req, res) => {
    try {
        const orderId = req.query.orderId;
        const order = await Order.findOne({ orderId: orderId })
            .populate('items.product')
            .populate('items.variant');
        res.render('user/order-failure', {
            order: order,
            orderId: orderId || '_HY252711',
            isLoggedIn: true
        });
    } catch (error) {
        console.error('Error fetching order for failure page:', error);
        res.render('user/order-failure', {
            order: null,
            orderId: req.query.orderId || '_HY252711',
            isLoggedIn: true
        });
    }
});

router.get('/profile/orders', isAuthenticated, getUserOrders);



router.get('/profile/orders/:id', isAuthenticated, getOrderDetails);
router.post('/profile/orders/:id/cancel', isAuthenticated, cancelOrderProduct);
router.post('/profile/orders/:id/return', isAuthenticated, returnOrderProduct);
router.post('/profile/orders/:id/review', isAuthenticated, submitProductReview);

router.get('/profile/orders/:id/invoice', isAuthenticated, downloadInvoice);


router.get('/checkout',isAuthenticated,getCheckoutPage);
router.post('/checkout/create-order',isAuthenticated,createOrder);
router.post('/checkout/apply-coupon',isAuthenticated,applyCoupon);
router.post('/checkout/remove-coupon',isAuthenticated,removeCoupon);
router.post('/checkout/place-order',isAuthenticated,placeOrder);
router.post('/checkout/verify-payment',isAuthenticated,verifyPayment);
router.post('/checkout/payment-failure',isAuthenticated,paymentFailed);


router.get('/payment-success',isAuthenticated,getPaymentSuccess);
router.get('/payment-failure',isAuthenticated,getPaymentFailed);
router.get('/payment-failed',isAuthenticated,getPaymentFailed);
router.get('/order/payment-success',isAuthenticated,getPaymentSuccess);
router.get('/order/payment-failed',isAuthenticated,getPaymentFailed);
router.post('/order/retry-payment',isAuthenticated,retryPayment);



//wishlist routes
router.get('/wishlist', isAuthenticated, getWishlistPage);
router.post('/wishlist/add', isAuthenticated, addToWishlist);
router.delete('/wishlist/remove/:productId', isAuthenticated, removeFromWishlist);

// navbar counts
router.get('/api/cart-count', getCartCount);
router.get('/api/wishlist-count', getWishlistCount);

router.get('/signup', (req, res) => {
    const ref = req.query.ref;
    res.redirect('/register' + (ref ? `?ref=${encodeURIComponent(ref)}` : ''));
});

router.get('/register', isGuest, getSignup);
router.post('/register', isGuest, signup);

router.get('/login', isGuest, getLogin);
router.post('/login', isGuest, login);

router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    googleAuthCallback
);

router.get('/verify-otp', getOTPVerify);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);

router.get('/forgot-password', isGuest, getForgotPassword);
router.post('/forgot-password', isGuest, forgotPassword);

router.get('/reset-password', isGuest, getResetPassword);
router.post('/reset-password', isGuest, resetPassword);

router.get('/logout', isAuthenticated, logout);

router.get('/profile', isAuthenticated, getProfile);
router.get('/profile/edit', isAuthenticated, getEditProfile);
router.post('/profile/update', isAuthenticated, upload.single('profileImage'), updateProfile);

router.post('/profile/upload-image', isAuthenticated, uploadProfileImage);

router.get('/profile/password', isAuthenticated, getChangePasswordPage);
router.post('/profile/change-password', isAuthenticated, changePassword);

router.get('/profile/wallet', isAuthenticated, getWalletPage);
router.post('/profile/wallet/add-money', isAuthenticated, addMoneyToWallet);

router.get('/profile/change-email/start', isAuthenticated, startEmailChange);

router.get('/profile/change-email/form', isAuthenticated, getChangeEmailForm);
router.post('/profile/change-email/form', isAuthenticated, processChangeEmailForm);

router.get('/profile/change-email/verify-new-otp', isAuthenticated, getVerifyNewEmailOTP);
router.post('/profile/change-email/verify-new-otp', isAuthenticated, verifyNewEmailOTP);
router.post('/profile/change-email/resend-new-otp', isAuthenticated, resendNewEmailOTP);

router.get('/profile/verify-email-otp', isAuthenticated, (req, res) => res.redirect('/profile/change-email/start'));
router.post('/profile/request-email-change', isAuthenticated, startEmailChange);

router.get('/profile/addresses', isAuthenticated, getAddresses);
router.get('/profile/addresses/add', isAuthenticated, getAddAddress);
router.post('/profile/addresses/add', isAuthenticated, addAddress);
router.get('/profile/addresses/edit/:id', isAuthenticated, getEditAddress);
router.post('/profile/addresses/edit/:id', isAuthenticated, updateAddress);

router.delete('/profile/addresses/:id', isAuthenticated, deleteAddress);
router.put('/profile/addresses/:id/default', isAuthenticated, setDefaultAddress);


export default router;


