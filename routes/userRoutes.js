import express from 'express';
import passport from 'passport';
import { isAuthenticated, isGuest } from '../middleware/auth.js';
import upload from '../config/multer.js';


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
  
} from '../controller/authController.js';


import {
    getProfile,
    getEditProfile,
    updateProfile,
    uploadProfileImage,
    changePassword,
    requestEmailChange,
    getEmailOTPVerify,
    verifyEmailChange,
    resendEmailOTP,
  
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


const router = express.Router();



router.get('/', (req, res) => {
    res.render('user/landing');
});

router.get('/home', isAuthenticated,(req,res)=>{
    res.render('user/home')
})



router.get('/register', isGuest, getSignup);
router.post('/register', isGuest, signup);


router.get('/login', isGuest, getLogin);
router.post('/login', isGuest, login);


router.get('/verify-otp', getOTPVerify);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);


router.get('/forgot-password', isGuest, getForgotPassword);
router.post('/forgot-password', isGuest, forgotPassword);


router.get('/reset-password', isGuest, getResetPassword);
router.post('/reset-password', isGuest, resetPassword);


router.get('/logout', isAuthenticated, logout);




router.get('/auth/google', isGuest, passport.authenticate('google', { scope: ['profile', 'email'] }));


router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        
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




router.get('/profile', isAuthenticated, getProfile);
router.get('/profile/edit', isAuthenticated, getEditProfile);
router.post('/profile/update', isAuthenticated, upload.single('profileImage'), updateProfile);


router.post('/profile/upload-image', isAuthenticated, uploadProfileImage);


router.get('/profile/password', isAuthenticated, async (req, res) => {
    try {
        const User = (await import('../model/User.js')).default;
        const user = await User.findById(req.session.userId);
       
        const hasPassword = user && user.password && user.password.startsWith('$2');
        res.render('user/change-password', { activeTab: 'password', hasPassword });
    } catch (e) {
        res.render('user/change-password', { activeTab: 'password', hasPassword: true });
    }
});

router.post('/profile/change-password', isAuthenticated, changePassword);


router.post('/profile/request-email-change', isAuthenticated, requestEmailChange);
router.get('/profile/verify-email-otp', isAuthenticated, getEmailOTPVerify);
router.post('/profile/verify-email-change', isAuthenticated, verifyEmailChange);
router.post('/profile/resend-email-otp', isAuthenticated, resendEmailOTP);




router.get('/profile/addresses', isAuthenticated, getAddresses);
router.get('/profile/addresses/add', isAuthenticated, getAddAddress);
router.post('/profile/addresses/add', isAuthenticated, addAddress);
router.get('/profile/addresses/edit/:id', isAuthenticated, getEditAddress);
router.post('/profile/addresses/edit/:id', isAuthenticated, updateAddress);


router.delete('/profile/addresses/:id', isAuthenticated, deleteAddress);
router.put('/profile/addresses/:id/default', isAuthenticated, setDefaultAddress);

export default router;