// import express from 'express';
// import { isAuthenticated, isGuest } from '../middleware/userAuth.js';
// import { upload } from '../middleware/upload.js';
// import passport from 'passport';
// import { getUserById } from '../services/userService.js';



// // Import auth controllers
// import {
//     getSignup,
//     signup,
//     getLogin,
//     login,
//     getOTPVerify,
//     verifyOTP,
//     resendOTP,
//     getForgotPassword,
//     forgotPassword,
//     getResetPassword,
//     resetPassword,
//     logout
// } from '../controller/authController.js';

// // Import profile controllers
// import {
//     getProfile,
//     getEditProfile,
//     updateProfile,
//     uploadProfileImage,
//     changePassword,
//     requestEmailChange,
//     getEmailOTPVerify,
//     verifyEmailChange,
//     resendEmailOTP
// } from '../controller/user/profileController.js';

// // Import address controllers
// import {
//     getAddresses,
//     getAddAddress,
//     addAddress,
//     getEditAddress,
//     updateAddress,
//     deleteAddress,
//     setDefaultAddress
// } from '../controller/user/addressController.js';






// const router = express.Router();

// router.get('/', (req, res) => {
//     res.render('user/landing');
// });

// router.get('/home', isAuthenticated, (req, res) => {
//     res.render('user/home');
// });

// router.get('/products', (req, res) => {
//     res.render('user/products');
// });

// router.get('/product-detail', (req, res) => {
//     res.render('user/product-detail');
// });

// router.get('/cart',(req,res)=>{
//     res.render('user/cart');
// })

// router.get('/wishlist',(req,res)=>{
//     res.render('user/wishlist');
// })



// router.get('/register', isGuest, getSignup);
// router.post('/register', isGuest, signup);

// router.get('/login', isGuest, getLogin);
// router.post('/login', isGuest, login);

// router.get('/auth/google',
//     passport.authenticate('google',{scope:['profile','email']})
// );

// router.get('/auth/google/callback',
//     passport.authenticate('google',{failureRedirect:'/login'}),
//     (req,res) =>{
//         req.session.userId = req.user._id;
//         req.session.user = {
//             id:req.user._id,
//             name:req.user.name,
//             email:req.user.email
//         };
//         res.redirect('/home');
//     }
// );

// router.get('/verify-otp', getOTPVerify);
// router.post('/verify-otp', verifyOTP);
// router.post('/resend-otp', resendOTP);

// router.get('/forgot-password', isGuest, getForgotPassword);
// router.post('/forgot-password', isGuest, forgotPassword);

// router.get('/reset-password', isGuest, getResetPassword);
// router.post('/reset-password', isGuest, resetPassword);

// router.get('/logout', isAuthenticated, logout);

// router.get('/profile', isAuthenticated, getProfile);
// router.get('/profile/edit', isAuthenticated, getEditProfile);
// router.post('/profile/update', isAuthenticated, upload.single('profileImage'), updateProfile);

// router.post('/profile/upload-image', isAuthenticated, uploadProfileImage);

// router.get('/profile/password', isAuthenticated, async (req, res) => {
//     try {
//         const user = await getUserById(req.session.userId);
//         const hasPassword = user && user.authProvider === 'local';
//         res.render('user/change-password', { activeTab: 'password', hasPassword });
//     } catch (error) {
//         console.error('Get password page error:', error);
//         res.redirect('/profile');
//     }
// });
// router.post('/profile/change-password', isAuthenticated, changePassword);

// router.post('/profile/request-email-change', isAuthenticated, requestEmailChange);
// router.get('/profile/verify-email-otp', isAuthenticated, getEmailOTPVerify);
// router.post('/profile/verify-email-change', isAuthenticated, verifyEmailChange);
// router.post('/profile/resend-email-otp', isAuthenticated, resendEmailOTP);

// // Address management routes
// router.get('/profile/addresses', isAuthenticated, getAddresses);
// router.get('/profile/addresses/add', isAuthenticated, getAddAddress);
// router.post('/profile/addresses/add', isAuthenticated, addAddress);
// router.get('/profile/addresses/edit/:id', isAuthenticated, getEditAddress);
// router.post('/profile/addresses/edit/:id', isAuthenticated, updateAddress);

// router.delete('/profile/addresses/:id', isAuthenticated, deleteAddress);
// router.put('/profile/addresses/:id/default', isAuthenticated, setDefaultAddress);

// export default router;


import express from 'express';
import { isAuthenticated, isGuest } from '../middleware/userAuth.js';
import { upload } from '../middleware/upload.js';
import passport from 'passport';
import { getUserById } from '../services/userService.js';

// Import auth controllers
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
    logout
} from '../controller/authController.js';

// Import profile controllers
import {
    getProfile,
    getEditProfile,
    updateProfile,
    uploadProfileImage,
    changePassword,
    requestEmailChange,
    getEmailOTPVerify,
    verifyEmailChange,
    resendEmailOTP
} from '../controller/user/profileController.js';

// Import address controllers
import {
    getAddresses,
    getAddAddress,
    addAddress,
    getEditAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
} from '../controller/user/addressController.js';

import{
    getProductsPage,
    getProductDetail
}from '../controller/user/productController.js';

import{
    getCartPage, 
    addToCart,
    updateQuantity,
    removeItem
}from '../controller/user/cartController.js';
import { isAdminAuthenticated } from '../middleware/adminAuth.js';

import{
    getWishlistPage,
    addToWishlist,
    removeFromWishlist
}from '../controller/user/wishlistController.js';



const router = express.Router();

console.log('UserRoutes module loaded');

router.get('/', (req, res) => {
    res.render('user/landing');
});

router.get('/home', isAuthenticated, (req, res) => {
    res.render('user/home');
});

// Products, Cart and Wishlist routes
router.get('/products',getProductsPage);
router.get('/product/:id',getProductDetail);

//cart routes
router.get('/cart',isAuthenticated,getCartPage);
router.post('/cart/add',isAuthenticated,addToCart);
router.post('/cart/update',isAuthenticated,updateQuantity);
router.delete('/cart/remove/:variantId',isAuthenticated,removeItem);

//wishlist routes
router.get('/wishlist',isAuthenticated,getWishlistPage);
router.post('/wishlist/add',isAuthenticated,addToWishlist);
router.delete('/wishlist/remove/:productId',isAuthenticated,removeFromWishlist);

router.get('/register', isGuest, getSignup);
router.post('/register', isGuest, signup);

router.get('/login', isGuest, getLogin);
router.post('/login', isGuest, login);

router.get('/auth/google',
    passport.authenticate('google',{scope:['profile','email']})
);

router.get('/auth/google/callback',
    passport.authenticate('google',{failureRedirect:'/login'}),
    (req,res) =>{
        req.session.userId = req.user._id;
        req.session.user = {
            id:req.user._id,
            name:req.user.name,
            email:req.user.email
        };
        res.redirect('/home');
    }
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

router.get('/profile/password', isAuthenticated, async (req, res) => {
    try {
        const user = await getUserById(req.session.userId);
        console.log('User authProvider:', user.authProvider); // Debug log
        console.log('User googleId:', user.googleId); // Debug log
        const hasPassword = user && user.authProvider === 'local';
        console.log('hasPassword:', hasPassword); // Debug log
        res.render('user/change-password', { activeTab: 'password', hasPassword });
    } catch (error) {
        console.error('Get password page error:', error);
        res.redirect('/profile');
    }
});
router.post('/profile/change-password', isAuthenticated, changePassword);

router.post('/profile/request-email-change', isAuthenticated, requestEmailChange);
router.get('/profile/verify-email-otp', isAuthenticated, getEmailOTPVerify);
router.post('/profile/verify-email-change', isAuthenticated, verifyEmailChange);
router.post('/profile/resend-email-otp', isAuthenticated, resendEmailOTP);

// Address management routes
router.get('/profile/addresses', isAuthenticated, getAddresses);
router.get('/profile/addresses/add', isAuthenticated, getAddAddress);
router.post('/profile/addresses/add', isAuthenticated, addAddress);
router.get('/profile/addresses/edit/:id', isAuthenticated, getEditAddress);
router.post('/profile/addresses/edit/:id', isAuthenticated, updateAddress);

router.delete('/profile/addresses/:id', isAuthenticated, deleteAddress);
router.put('/profile/addresses/:id/default', isAuthenticated, setDefaultAddress);

export default router;


