import User from '../model/User.js';
import { hashPassword, comparePassword, sendResponse, addMinutes, generateToken } from '../utils/helpers.js';
import { sendOTP, sendResetPassword } from '../services/emailService.js';
import { generate, isValid, clear } from '../services/otpService.js';
import {
    validateSignupData,
    validateLoginData,
    validateOTP,
    checkEmailExists,
    getUserByEmail,
    getUserByResetToken
} from '../services/userService.js';


export const getSignup = (req, res) => {
    const error = req.session.signupError || null;
    delete req.session.signupError;
    res.render('user/register', { error });
};


export const signup = async (req, res) => {
    try {
        const { name, email, phone, password, confirmPassword } = req.body;


        if (password !== confirmPassword) {
            req.session.signupError = 'Passwords do not match';
            return res.redirect('/register');
        }


        const validation = validateSignupData({ name,phone,email, password });
        if (!validation.isValid) {
            req.session.signupError = validation.error;
            return res.redirect('/register');
        }

        const emailExists = await checkEmailExists(email);
        if (emailExists) {
            req.session.signupError = 'Email already registered';
            return res.redirect('/register');
        }

        const hashedPassword = await hashPassword(password);
        const otp = generate();

        const newUser = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone:phone.trim(),
            password: hashedPassword,
            isAdmin: false,
            otp: otp,
            otpExpiry: addMinutes(5)
        });

        await newUser.save();

        try {
            await sendOTP(email, otp, name);

            req.session.tempUserId = newUser._id;
            req.session.otpSuccess = 'OTP sent to your email';
            
            res.redirect('/verify-otp');
        } catch (emailError) {
            console.error('Email sending failed:', emailError);


            if (process.env.NODE_ENV === 'development') {
                newUser.isVerified = true;
                newUser.otp = null;
                newUser.otpExpiry = null;
                await newUser.save();

                // Create user session
                req.session.userId = newUser._id;
                req.session.user = {
                    id: newUser._id,
                    name: newUser.name,
                    email: newUser.email,
                    profileImage: newUser.profileImage
                };

                res.redirect('/home');
            } else {
                await User.findByIdAndDelete(newUser._id);
                req.session.signupError = 'Failed to send verification email. Please check your email address and try again.';
                return res.redirect('/register');
            }
        }

    } catch (error) {
        console.error('Signup error:', error);
        req.session.signupError = 'Something went wrong. Please try again.';
        return res.redirect('/register');
    }
};


export const getLogin = (req, res) => {
    const error = req.session.loginError || null;
    const success = req.session.loginSuccess || null;
    delete req.session.loginError;
    delete req.session.loginSuccess;
    res.render('user/login', { error, success });
};


export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const validation = validateLoginData({ email, password });
        if (!validation.isValid) {
            req.session.loginError = validation.error;
            return res.redirect('/login');
        }

        const user = await getUserByEmail(email);
        if (!user) {
            req.session.loginError = 'Invalid email or password';
            return res.redirect('/login');
        }

        if (user.isBlocked) {
            req.session.loginError = 'Your account has been blocked';
            return res.redirect('/login');
        }

        if (!user.isVerified) {
            req.session.loginError = 'Please verify your email first';
            return res.redirect('/login');
        }

        if (user.authProvider === 'google') {
            req.session.loginError = 'This account uses Google Sign-In. Please use the "Sign in with Google" button or set a password from your profile page first.';
            return res.redirect('/login');
        }

        const passwordMatch = await comparePassword(password, user.password);
        if (!passwordMatch) {
            req.session.loginError = 'Invalid email or password';
            return res.redirect('/login');
        }

        req.session.userId = user._id;
        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            profileImage: user.profileImage
        };

        res.redirect('/home');

    } catch (error) {
        console.error('Login error:', error);
        req.session.loginError = 'Something went wrong. Please try again.';
        return res.redirect('/login');
    }
};


export const getOTPVerify = (req, res) => {
    if (!req.session.tempUserId) {
        return res.redirect('/register');
    }
    
    const error = req.session.otpError || null;
    const success = req.session.otpSuccess || null;
    delete req.session.otpError;
    delete req.session.otpSuccess;
    
    res.render('user/otp-verify', { error, success });
};


export const verifyOTP = async (req, res) => {
    try {
        const { otp1, otp2, otp3, otp4, otp5, otp6 } = req.body;
        const otp = `${otp1}${otp2}${otp3}${otp4}${otp5}${otp6}`;
        const userId = req.session.tempUserId;

        if (!userId) {
            req.session.otpError = 'Session expired. Please register again.';
            return res.redirect('/verify-otp');
        }

        const validation = validateOTP(otp);
        if (!validation.isValid) {
            req.session.otpError = validation.error;
            return res.redirect('/verify-otp');
        }

        const user = await User.findById(userId);
        if (!user) {
            req.session.otpError = 'User not found';
            return res.redirect('/verify-otp');
        }

        if (!isValid(user, otp)) {
            req.session.otpError = 'Invalid or expired OTP';
            return res.redirect('/verify-otp');
        }

        user.isVerified = true;
        clear(user);
        await user.save();

        delete req.session.tempUserId;
        req.session.userId = user._id;
        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            profileImage: user.profileImage
        };

        res.redirect('/home');

    } catch (error) {
        console.error('OTP verification error:', error);
        req.session.otpError = 'Something went wrong. Please try again.';
        res.redirect('/verify-otp');
    }
};


export const resendOTP = async (req, res) => {
    try {
        const userId = req.session.tempUserId;

        if (!userId) {
            return sendResponse(res, false, 'Session expired');
        }

        const user = await User.findById(userId);
        if (!user) {
            return sendResponse(res, false, 'User not found');
        }


        const newOTP = generate();
        user.otp = newOTP;
        user.otpExpiry = addMinutes(5);
        await user.save();


        await sendOTP(user.email, newOTP, user.name);

        sendResponse(res, true, 'New OTP sent successfully');

    } catch (error) {
        console.error('Resend OTP error:', error);
        sendResponse(res, false, 'Failed to send OTP');
    }
};


export const getForgotPassword = (req, res) => {
    res.render('user/forgot-password', { error: null, success: null });
};


export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.render('user/forgot-password', {
                error: 'Please enter your email',
                success: null
            });
        }

        const user = await getUserByEmail(email);
        if (!user) {
            return res.render('user/forgot-password', {
                error: 'No account found with this email',
                success: null
            });
        }

        // Check if user registered with Google
        if (user.authProvider === 'google') {
            return res.render('user/forgot-password', {
                error: 'This account uses Google Sign-In. Please login with Google or set a password from your profile page.',
                success: null
            });
        }

        const resetToken = generateToken();
        user.resetToken = resetToken;
        user.resetExpiry = addMinutes(15);
        await user.save();

        try {
            await sendResetPassword(user.email, resetToken, user.name);

            res.render('user/forgot-password', {
                error: null,
                success: 'Password reset link sent to your email'
            });
        } catch (emailError) {
            console.error('Failed to send reset email:', emailError);

            if (process.env.NODE_ENV === 'development') {
                res.render('user/forgot-password', {
                    error: null,
                    success: `Password reset link: ${process.env.BASE_URL}/reset-password?token=${resetToken}`
                });
            } else {
                res.render('user/forgot-password', {
                    error: 'Failed to send reset email. Please try again.',
                    success: null
                });
            }
        }

    } catch (error) {
        console.error('Forgot password error:', error);
        res.render('user/forgot-password', {
            error: 'Something went wrong. Please try again.',
            success: null
        });
    }
};


export const getResetPassword = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            console.log('No token provided');
            return res.render('user/reset-password', {
                error: 'Invalid reset link',
                success: null,
                token: null
            });
        }


        const user = await getUserByResetToken(token);

        if (!user) {
            console.log('No user found for token:', token);
            return res.render('user/reset-password', {
                error: 'Invalid reset link',
                success: null,
                token: null
            });
        }


        const now = new Date();
        const expiry = user.resetExpiry;

        if (user.resetExpiry < new Date()) {
            console.log('Token has expired');
            return res.render('user/reset-password', {
                error: 'Reset link has expired',
                success: null,
                token: null
            });
        }

        res.render('user/reset-password', {
            error: null,
            success: null,
            token: token
        });

    } catch (error) {
        console.error('Get reset password error:', error);
        res.render('user/reset-password', {
            error: 'Something went wrong',
            success: null,
            token: null
        });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { token, password, confirmPassword } = req.body;  

        if (!token) {
            return res.render('user/reset-password', {
                error: 'Invalid reset link',
                success: null,
                token: null
            });
        }

        if (!password || password.length < 8) {
            return res.render('user/reset-password', {
                error: 'Password must be at least 8 characters',
                success: null,
                token: token
            });
        }

        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
            return res.render('user/reset-password', {
                error: 'Password must contain uppercase, lowercase, number, and special character',
                success: null,
                token: token
            });
        }

        if (password !== confirmPassword) {
            return res.render('user/reset-password', {
                error: 'Passwords do not match',
                success: null,
                token: token
            });
        }

        const user = await getUserByResetToken(token);
        if (!user) {
            return res.render('user/reset-password', {
                error: 'Invalid reset link',
                success: null,
                token: null
            });
        }

        if (user.resetExpiry < new Date()) {
            return res.render('user/reset-password', {
                error: 'Reset link has expired',
                success: null,
                token: null
            });
        }


        user.password = await hashPassword(password);
        user.resetToken = null;
        user.resetExpiry = null;
        await user.save();

        res.render('user/login', {
            error: null,
            success: 'Password reset successfully. Please login.'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.render('user/reset-password', {
            error: 'Something went wrong. Please try again.',
            success: null,
            token: req.body.token
        });
    }
};


export const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/');
    });
};

export const getLandingPage = (req, res) => {
    res.render('user/landing');
};

export const getHomePage = (req, res) => {
    res.render('user/home');
};

export const googleAuthCallback = (req, res) => {
    req.session.userId = req.user._id;
    req.session.user = {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email
    };
    res.redirect('/home');
};


