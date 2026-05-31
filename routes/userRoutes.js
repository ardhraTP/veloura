import express from 'express';
import passport from 'passport';
import { isAuthenticated, isGuest } from '../middleware/auth.js';
import upload from '../config/multer.js';

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

const router = express.Router();


// Landing page
router.get('/', (req, res) => {
    res.render('user/landing');
});

// Home page (for logged-in users)
router.get('/home', isAuthenticated, (req, res) => {
    res.render('user/home');
});

// ==================== AUTH ROUTES ====================

// Signup routes
router.get('/register', isGuest, getSignup);
router.post('/register', isGuest, signup);

// Login routes
router.get('/login', isGuest, getLogin);
router.post('/login', isGuest, login);

// OTP verification routes
router.get('/verify-otp', getOTPVerify);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);

// Forgot password routes
router.get('/forgot-password', isGuest, getForgotPassword);
router.post('/forgot-password', isGuest, forgotPassword);

// Reset password routes
router.get('/reset-password', isGuest, getResetPassword);
router.post('/reset-password', isGuest, resetPassword);

// Logout route
router.get('/logout', isAuthenticated, logout);

// ==================== GOOGLE OAUTH ROUTES ====================

// Initiate Google OAuth flow
router.get('/auth/google', isGuest, passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth callback
router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // Set session userId to match isAuthenticated middleware
        req.session.userId = req.user._id;
        req.session.user = {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            profileImage: req.user.profileImage
        };
        res.redirect('/home');
    }
);

// ==================== PROFILE ROUTES ====================

// Profile routes
router.get('/profile', isAuthenticated, getProfile);
router.get('/profile/edit', isAuthenticated, getEditProfile);
router.post('/profile/update', isAuthenticated, upload.single('profileImage'), updateProfile);

// Profile image upload
router.post('/profile/upload-image', isAuthenticated, uploadProfileImage);

// Password change
router.get('/profile/password', isAuthenticated, async (req, res) => {
    try {
        const User = (await import('../model/User.js')).default;
        const user = await User.findById(req.session.userId);
        // A real bcrypt hash always starts with $2b$ or $2a$
        const hasPassword = user && user.password && user.password.startsWith('$2');
        res.render('user/change-password', { activeTab: 'password', hasPassword });
    } catch (e) {
        res.render('user/change-password', { activeTab: 'password', hasPassword: true });
    }
});

router.post('/profile/change-password', isAuthenticated, changePassword);

// Email change routes
router.post('/profile/request-email-change', isAuthenticated, requestEmailChange);
router.get('/profile/verify-email-otp', isAuthenticated, getEmailOTPVerify);
router.post('/profile/verify-email-change', isAuthenticated, verifyEmailChange);
router.post('/profile/resend-email-otp', isAuthenticated, resendEmailOTP);

// ==================== ADDRESS ROUTES ====================

// Address management routes
router.get('/profile/addresses', isAuthenticated, getAddresses);
router.get('/profile/addresses/add', isAuthenticated, getAddAddress);
router.post('/profile/addresses/add', isAuthenticated, addAddress);
router.get('/profile/addresses/edit/:id', isAuthenticated, getEditAddress);
router.post('/profile/addresses/edit/:id', isAuthenticated, updateAddress);

// Address API routes (for AJAX calls)
router.delete('/profile/addresses/:id', isAuthenticated, deleteAddress);
router.put('/profile/addresses/:id/default', isAuthenticated, setDefaultAddress);

export default router;