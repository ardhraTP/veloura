import User from '../model/user.js';
import { hashPassword, comparePassword, sendResponse, addMinutes, generateToken } from '../utils/helpers.js';
import { sendOTP, sendResetPassword } from '../services/emailService.js';
import { generate, isValid, clear } from '../services/otpService.js';
import { 
    validateSignupData, 
    validateLoginData, 
    validateOTP,
    checkEmailExists, 
    checkPhoneExists, 
    getUserByEmail,
    getUserByResetToken 
} from '../services/userService.js';

// Render signup page
export const getSignup = (req, res) => {
    res.render('user/register', { error: null });
};

// Handle signup
export const signup = async (req, res) => {
    try {
        const { name, email, phone, password, confirmPassword } = req.body;
        
        // Check if passwords match
        if (password !== confirmPassword) {
            return res.render('user/register', { error: 'Passwords do not match' });
        }
        
        // Validate input using service
        const validation = validateSignupData({ name, email, phone, password });
        if (!validation.isValid) {
            return res.render('user/register', { error: validation.error });
        }

        // Check if email already exists using service
        const emailExists = await checkEmailExists(email);
        if (emailExists) {
            return res.render('user/register', { error: 'Email already registered' });
        }

        // Check if phone already exists using service
        const phoneExists = await checkPhoneExists(phone);
        if (phoneExists) {
            return res.render('user/register', { error: 'Phone number already registered' });
        }

        // Create new user
        const hashedPassword = await hashPassword(password);
        const otp = generate();
        
        const newUser = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            password: hashedPassword,
            otp: otp,
            otpExpiry: addMinutes(5)
        });

        await newUser.save();

        // Try to send OTP email
        try {
            await sendOTP(email, otp, name);
            
            // Store user ID for OTP verification
            req.session.tempUserId = newUser._id;
            
            res.render('user/otp-verify', { 
                error: null, 
                success: 'OTP sent to your email',
                email: email 
            });
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            
            // For development: Auto-verify the user if email fails
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
                    email: newUser.email
                };
                
                res.redirect('/home');
            } else {
                // In production, show error
                await User.findByIdAndDelete(newUser._id); // Clean up user
                return res.render('user/register', { 
                    error: 'Failed to send verification email. Please check your email address and try again.' 
                });
            }
        }

    } catch (error) {
        console.error('Signup error:', error);
        res.render('user/register', { error: 'Something went wrong. Please try again.' });
    }
};

// Render login page
export const getLogin = (req, res) => {
    res.render('user/login', { error: null });
};

// Handle login
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input using service
        const validation = validateLoginData({ email, password });
        if (!validation.isValid) {
            return res.render('user/login', { error: validation.error });
        }

        // Find user using service
        const user = await getUserByEmail(email);
        if (!user) {
            return res.render('user/login', { error: 'Invalid email or password' });
        }

        // Check if account is blocked
        if (user.isBlocked) {
            return res.render('user/login', { error: 'Your account has been blocked' });
        }

        // Check if email is verified
        if (!user.isVerified) {
            return res.render('user/login', { error: 'Please verify your email first' });
        }

        // Check password
        const passwordMatch = await comparePassword(password, user.password);
        if (!passwordMatch) {
            return res.render('user/login', { error: 'Invalid email or password' });
        }

        // Create session
        req.session.userId = user._id;
        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email
        };

        res.redirect('/home');

    } catch (error) {
        console.error('Login error:', error);
        res.render('user/login', { error: 'Something went wrong. Please try again.' });
    }
};

// Render OTP verification page
export const getOTPVerify = (req, res) => {
    if (!req.session.tempUserId) {
        return res.redirect('/register');
    }
    res.render('user/otp-verify', { error: null, success: null });
};

// Handle OTP verification
export const verifyOTP = async (req, res) => {
    try {
        // Combine the 6 OTP digits from separate form fields
        const { otp1, otp2, otp3, otp4, otp5, otp6 } = req.body;
        const otp = `${otp1}${otp2}${otp3}${otp4}${otp5}${otp6}`;
        const userId = req.session.tempUserId;

        if (!userId) {
            return res.render('user/otp-verify', { 
                error: 'Session expired. Please register again.',
                success: null 
            });
        }

        // Validate OTP using service
        const validation = validateOTP(otp);
        if (!validation.isValid) {
            return res.render('user/otp-verify', { 
                error: validation.error,
                success: null 
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.render('user/otp-verify', { 
                error: 'User not found',
                success: null 
            });
        }

        // Check if OTP is valid
        if (!isValid(user, otp)) {
            return res.render('user/otp-verify', { 
                error: 'Invalid or expired OTP',
                success: null 
            });
        }

        // Verify user account
        user.isVerified = true;
        clear(user);
        await user.save();

        // Create user session
        delete req.session.tempUserId;
        req.session.userId = user._id;
        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email
        };

        res.redirect('/home');

    } catch (error) {
        console.error('OTP verification error:', error);
        res.render('user/otp-verify', { 
            error: 'Something went wrong. Please try again.',
            success: null 
        });
    }
};

// Resend OTP
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

        // Generate new OTP
        const newOTP = generate();
        user.otp = newOTP;
        user.otpExpiry = addMinutes(5);
        await user.save();

        // Send new OTP
        await sendOTP(user.email, newOTP, user.name);

        sendResponse(res, true, 'New OTP sent successfully');

    } catch (error) {
        console.error('Resend OTP error:', error);
        sendResponse(res, false, 'Failed to send OTP');
    }
};

// Render forgot password page
export const getForgotPassword = (req, res) => {
    res.render('user/forgot-password', { error: null, success: null });
};

// Handle forgot password
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.render('user/forgot-password', { 
                error: 'Please enter your email',
                success: null 
            });
        }

        // Find user using service
        const user = await getUserByEmail(email);
        if (!user) {
            return res.render('user/forgot-password', { 
                error: 'No account found with this email',
                success: null 
            });
        }

        // Generate reset token
        const resetToken = generateToken();
        user.resetToken = resetToken;
        user.resetExpiry = addMinutes(15);
        await user.save();

        console.log('Generated reset token:', resetToken); // Debug log
        console.log('Reset link:', `${process.env.BASE_URL}/reset-password?token=${resetToken}`); // Debug log

        // Try to send reset email
        try {
            await sendResetPassword(user.email, resetToken, user.name);
            
            res.render('user/forgot-password', { 
                error: null,
                success: 'Password reset link sent to your email' 
            });
        } catch (emailError) {
            console.error('Failed to send reset email:', emailError);
            
            // For development: Show the reset link directly
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

// Render reset password page
export const getResetPassword = async (req, res) => {
    try {
        const { token } = req.query;
        
        console.log('Reset password request with token:', token); // Debug log

        if (!token) {
            console.log('No token provided'); // Debug log
            return res.render('user/reset-password', { 
                error: 'Invalid reset link',
                success: null,
                token: null 
            });
        }

        // Find user by reset token using service
        const user = await getUserByResetToken(token);
        console.log('User found for token:', user ? 'Yes' : 'No'); // Debug log
        
        if (!user) {
            console.log('No user found for token:', token); // Debug log
            return res.render('user/reset-password', { 
                error: 'Invalid reset link',
                success: null,
                token: null 
            });
        }

        // Check if token is expired
        const now = new Date();
        const expiry = user.resetExpiry;
        console.log('Current time:', now); // Debug log
        console.log('Token expiry:', expiry); // Debug log
        console.log('Token expired:', expiry < now); // Debug log
        
        if (user.resetExpiry < new Date()) {
            console.log('Token has expired'); // Debug log
            return res.render('user/reset-password', { 
                error: 'Reset link has expired',
                success: null,
                token: null 
            });
        }

        console.log('Token is valid, rendering reset form'); // Debug log
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

// Handle reset password
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

        if (password !== confirmPassword) {
            return res.render('user/reset-password', { 
                error: 'Passwords do not match',
                success: null,
                token: token 
            });
        }

        // Find user by reset token using service
        const user = await getUserByResetToken(token);
        if (!user) {
            return res.render('user/reset-password', { 
                error: 'Invalid reset link',
                success: null,
                token: null 
            });
        }

        // Check if token is expired
        if (user.resetExpiry < new Date()) {
            return res.render('user/reset-password', { 
                error: 'Reset link has expired',
                success: null,
                token: null 
            });
        }

        // Update password
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

// Logout
export const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/');
    });
};
