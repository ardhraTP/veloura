import { hashPassword, comparePassword, sendResponse, addMinutes } from '../../utils/helpers.js';
import { sendOTP } from '../../services/emailService.js';
import { generate, isValid, clear } from '../../services/otpService.js';
import cloudinary from '../../config/cloudinary.js';
import fs from 'fs';
import {
    validateProfileData,
    validatePasswordChange,
    validateEmailChange,
    validateOTP,
    checkPhoneExists,
    checkEmailExists,
    getUserById,
    updateUserProfile,
    updateUserProfileImage,
    saveUser
} from '../../services/userService.js';


export const getProfile = async (req, res) => {
    try {
        const user = await getUserById(req.session.userId);
        if (!user) {
            return res.redirect('/login');
        }


        const emailUpdateSuccess = req.session.emailUpdateSuccess;
        delete req.session.emailUpdateSuccess;

        res.render('user/profile', {
            user,
            activeTab: 'profile',
            success: emailUpdateSuccess || null
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.redirect('/home');
    }
};

export const getEditProfile = async (req, res) => {
    try {

        const user = await getUserById(req.session.userId);
        if (!user) {
            return res.redirect('/login');
        }

        console.log('User data:', {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone
        });


        const successMessage = req.session.profileUpdateSuccess;
        delete req.session.profileUpdateSuccess;

        console.log('Success message from session:', successMessage);


        res.render('user/edit-profile', {
            user,
            error: null,
            success: successMessage || null,
            activeTab: 'profile'

        });
    } catch (error) {
        console.error('Get edit profile error:', error);
        res.redirect('/profile');
    }
};


export const updateProfile = async (req, res) => {
    try {
        const { name, phone, deleteProfileImage } = req.body;
        const userId = req.session.userId;

        const currentUser = await getUserById(userId);
        if (!currentUser) return res.redirect('/login');

        const validation = validateProfileData({ name, phone });
        if (!validation.isValid) {

            if (req.file) fs.unlinkSync(req.file.path);
            return res.render('user/edit-profile', {
                user: currentUser,
                error: validation.error,
                success: null,
                activeTab: 'profile'
            });
        }

        const phoneExists = await checkPhoneExists(phone, userId);
        if (phoneExists) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.render('user/edit-profile', {
                user: currentUser,
                error: 'Phone number already exists',
                success: null,
                activeTab: 'profile'
            });
        }

        const updateData = {
            name: name.trim(),
            phone: phone.trim()
        };


        if (req.file) {
            try {
                const result = await cloudinary.uploader.upload(req.file.path, {
                    folder: 'veloura/profiles',
                    public_id: `profile_${userId}_${Date.now()}`
                });
                updateData.profileImage = result.secure_url;


                fs.unlinkSync(req.file.path);
            } catch (uploadError) {
                console.error('Cloudinary upload error:', uploadError);
                fs.unlinkSync(req.file.path);
                return res.render('user/edit-profile', {
                    user: currentUser,
                    error: 'Failed to upload image. Please try again.',
                    success: null,
                    activeTab: 'profile'
                });
            }
        }


        if (deleteProfileImage === 'true') {
            updateData.profileImage = null;
        }

        await updateUserProfile(userId, updateData);

        const updatedUser = await getUserById(userId);
        req.session.user.name = updatedUser.name;
        if (updateData.profileImage !== undefined) {
            req.session.user.profileImage = updateData.profileImage;
        }

        req.session.profileUpdateSuccess = 'Profile updated successfully';
        res.redirect('/profile/edit');

    } catch (error) {
        console.error('Update profile error:', error);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        const user = await getUserById(req.session.userId);
        res.render('user/edit-profile', {
            user,
            error: 'Something went wrong. Please try again.',
            success: null,
            activeTab: 'profile'
        });
    }
};


export const uploadProfileImage = async (req, res) => {
    try {
        const userId = req.session.userId;

        if (!req.file) {
            return sendResponse(res, false, 'Please select an image');
        }

        const tempFilePath = req.file.path;


        const result = await cloudinary.uploader.upload(tempFilePath, {
            upload_preset: 'ml_default',
            folder: 'veloura/profiles',
            public_id: `profile_${userId}_${Date.now()}`
        });

        console.log('Cloudinary upload successful:', result.secure_url);


        try {
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
                console.log('Temp file deleted:', tempFilePath);
            }
        } catch (err) {
            console.log('Error deleting temp file:', err);
        }


        
        await updateUserProfileImage(userId, result.secure_url);

        if (req.session.user) {
            req.session.user.profileImage = result.secure_url;
        }

        sendResponse(res, true, 'Profile image updated successfully', {
            imageUrl: result.secure_url
        });

    } catch (error) {
        console.error('Upload image error:', error);


        if (req.file && req.file.path) {
            try {
                if (fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                    console.log('Temp file deleted after error:', req.file.path);
                }
            } catch (err) {
                console.log('Error deleting temp file on error:', err);
            }
        }

        sendResponse(res, false, 'Failed to upload image');
    }
};


export const changePassword = async (req, res) => {
    try {
        const passwordData = req.body;
        const userId = req.session.userId;

        const user = await getUserById(userId);
        if (!user) {
            return sendResponse(res, false, 'User not found');
        }

        const isGoogleUser = user.authProvider === 'google';

        if (isGoogleUser) {
           
            if (!passwordData.newPassword || !passwordData.confirmPassword) {
                return sendResponse(res, false, 'Please enter new password and confirmation');
            }

            if (passwordData.newPassword.length < 8) {
                return sendResponse(res, false, 'Password must be at least 8 characters long');
            }

            const hasUpperCase = /[A-Z]/.test(passwordData.newPassword);
            const hasLowerCase = /[a-z]/.test(passwordData.newPassword);
            const hasNumber = /[0-9]/.test(passwordData.newPassword);
            const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword);

            if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
                return sendResponse(res, false, 'Password must contain uppercase, lowercase, number, and special character');
            }

            if (passwordData.newPassword !== passwordData.confirmPassword) {
                return sendResponse(res, false, 'Passwords do not match');
            }

            const hashedNewPassword = await hashPassword(passwordData.newPassword);
            user.password = hashedNewPassword;
            user.authProvider = 'local'; 
            await saveUser(user);

            return sendResponse(res, true, 'Password set successfully! You can now login with email and password.');
        }

        const validation = validatePasswordChange(passwordData);
        if (!validation.isValid) {
            return sendResponse(res, false, validation.error);
        }

        const isCurrentPasswordCorrect = await comparePassword(passwordData.currentPassword, user.password);
        if (!isCurrentPasswordCorrect) {
            return sendResponse(res, false, 'Current password is incorrect');
        }

        const hashedNewPassword = await hashPassword(passwordData.newPassword);
        user.password = hashedNewPassword;
        await saveUser(user);

        sendResponse(res, true, 'Password changed successfully');

    } catch (error) {
        console.error('Change password error:', error);
        sendResponse(res, false, 'Something went wrong');
    }
};


// ========================================================
// EMAIL CHANGE FLOW (TWO-STAGE OTP VERIFICATION)
// ========================================================

// Step 1: Start Email Change -> Send OTP to existing email ID
export const startEmailChange = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await getUserById(userId);

        if (!user) {
            return res.redirect('/login');
        }

        // Generate 6-digit OTP for current email verification
        const otp = generate();
        user.otp = otp;
        user.otpExpiry = addMinutes(5);
        await saveUser(user);

        // Update session state for current email OTP verification
        req.session.emailChangeStep = 'verify_current_otp';
        req.session.currentEmailVerified = false;
        delete req.session.pendingNewEmail;

        // Send OTP to existing email
        await sendOTP(user.email, otp, user.name);

        // Redirect to OTP verification page for existing email
        res.redirect('/profile/change-email/verify-current-otp');
    } catch (error) {
        console.error('Start email change error:', error);
        res.redirect('/profile/edit');
    }
};

// Step 1 Page: Render OTP verification page for existing email
export const getVerifyCurrentEmailOTP = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await getUserById(userId);

        if (!user) {
            return res.redirect('/login');
        }

        // Render OTP verification view configured for current email
        res.render('user/email-otp-verify', {
            pageTitle: 'Verify Current Email',
            emailLabel: 'your existing registered email address',
            targetEmail: user.email,
            actionUrl: '/profile/change-email/verify-current-otp',
            resendUrl: '/profile/change-email/resend-current-otp',
            buttonText: 'Verify OTP & Continue',
            error: null,
            success: null
        });
    } catch (error) {
        console.error('Get verify current email OTP error:', error);
        res.redirect('/profile/edit');
    }
};

// Step 1 Process: Verify OTP for existing email
export const verifyCurrentEmailOTP = async (req, res) => {
    try {
        const { otp1, otp2, otp3, otp4, otp5, otp6 } = req.body;
        const otp = `${otp1}${otp2}${otp3}${otp4}${otp5}${otp6}`;
        const userId = req.session.userId;

        const user = await getUserById(userId);
        if (!user) {
            return res.redirect('/login');
        }

        // Validate OTP format
        const validation = validateOTP(otp);
        if (!validation.isValid) {
            return res.render('user/email-otp-verify', {
                pageTitle: 'Verify Current Email',
                emailLabel: 'your existing registered email address',
                targetEmail: user.email,
                actionUrl: '/profile/change-email/verify-current-otp',
                resendUrl: '/profile/change-email/resend-current-otp',
                buttonText: 'Verify OTP & Continue',
                error: validation.error,
                success: null
            });
        }

        // Verify if OTP matches and is not expired
        if (!isValid(user, otp)) {
            return res.render('user/email-otp-verify', {
                pageTitle: 'Verify Current Email',
                emailLabel: 'your existing registered email address',
                targetEmail: user.email,
                actionUrl: '/profile/change-email/verify-current-otp',
                resendUrl: '/profile/change-email/resend-current-otp',
                buttonText: 'Verify OTP & Continue',
                error: 'Invalid or expired OTP. Please try again.',
                success: null
            });
        }

        // Clear user OTP and update session status
        clear(user);
        await saveUser(user);

        req.session.currentEmailVerified = true;
        req.session.emailChangeStep = 'enter_new_email';

        // Redirect to form for entering new email
        res.redirect('/profile/change-email/form');
    } catch (error) {
        console.error('Verify current email OTP error:', error);
        const user = await getUserById(req.session.userId);
        res.render('user/email-otp-verify', {
            pageTitle: 'Verify Current Email',
            emailLabel: 'your existing registered email address',
            targetEmail: user ? user.email : '',
            actionUrl: '/profile/change-email/verify-current-otp',
            resendUrl: '/profile/change-email/resend-current-otp',
            buttonText: 'Verify OTP & Continue',
            error: 'Something went wrong. Please try again.',
            success: null
        });
    }
};

// Resend OTP to current email
export const resendCurrentEmailOTP = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await getUserById(userId);

        if (!user) {
            return sendResponse(res, false, 'User not found');
        }

        const newOTP = generate();
        user.otp = newOTP;
        user.otpExpiry = addMinutes(5);
        await saveUser(user);

        await sendOTP(user.email, newOTP, user.name);
        sendResponse(res, true, 'OTP resent successfully to your current email address');
    } catch (error) {
        console.error('Resend current email OTP error:', error);
        sendResponse(res, false, 'Failed to resend OTP');
    }
};

// Step 2 Page: Render Change Email Form (Existing, New, Confirm)
export const getChangeEmailForm = async (req, res) => {
    try {
        // Guard: check if current email was verified
        if (!req.session.currentEmailVerified) {
            return res.redirect('/profile/change-email/start');
        }

        const user = await getUserById(req.session.userId);
        if (!user) {
            return res.redirect('/login');
        }

        res.render('user/change-email-form', {
            user,
            error: null
        });
    } catch (error) {
        console.error('Get change email form error:', error);
        res.redirect('/profile/edit');
    }
};

// Step 2 Process: Handle Change Email Form submission -> Send OTP to new email
export const processChangeEmailForm = async (req, res) => {
    try {
        if (!req.session.currentEmailVerified) {
            return res.redirect('/profile/change-email/start');
        }

        const { existingEmail, newEmail, confirmEmail } = req.body;
        const userId = req.session.userId;
        const user = await getUserById(userId);

        if (!user) {
            return res.redirect('/login');
        }

        const cleanedNewEmail = (newEmail || '').toLowerCase().trim();
        const cleanedConfirmEmail = (confirmEmail || '').toLowerCase().trim();

        // Validation
        if (!cleanedNewEmail || !cleanedConfirmEmail) {
            return res.render('user/change-email-form', {
                user,
                error: 'Please enter and confirm your new email address'
            });
        }

        if (cleanedNewEmail !== cleanedConfirmEmail) {
            return res.render('user/change-email-form', {
                user,
                error: 'New email and confirm email do not match'
            });
        }

        if (cleanedNewEmail === user.email.toLowerCase()) {
            return res.render('user/change-email-form', {
                user,
                error: 'New email address must be different from your current email'
            });
        }

        const validation = validateEmailChange({ newEmail: cleanedNewEmail });
        if (!validation.isValid) {
            return res.render('user/change-email-form', {
                user,
                error: validation.error
            });
        }

        // Check if new email is already registered by another account
        const emailExists = await checkEmailExists(cleanedNewEmail, userId);
        if (emailExists) {
            return res.render('user/change-email-form', {
                user,
                error: 'This email address is already registered with another account'
            });
        }

        // Generate OTP for new email verification
        const otp = generate();
        user.otp = otp;
        user.otpExpiry = addMinutes(5);
        await saveUser(user);

        // Store pending new email in session
        req.session.pendingNewEmail = cleanedNewEmail;
        req.session.emailChangeStep = 'verify_new_otp';

        // Send OTP to new email
        await sendOTP(cleanedNewEmail, otp, user.name);

        // Redirect to OTP verification page for new email
        res.redirect('/profile/change-email/verify-new-otp');
    } catch (error) {
        console.error('Process change email form error:', error);
        const user = await getUserById(req.session.userId);
        res.render('user/change-email-form', {
            user,
            error: 'Something went wrong. Please try again.'
        });
    }
};

// Step 3 Page: Render OTP verification page for new email
export const getVerifyNewEmailOTP = async (req, res) => {
    try {
        if (!req.session.currentEmailVerified || !req.session.pendingNewEmail) {
            return res.redirect('/profile/change-email/start');
        }

        res.render('user/email-otp-verify', {
            pageTitle: 'Verify New Email',
            emailLabel: 'your new email address',
            targetEmail: req.session.pendingNewEmail,
            actionUrl: '/profile/change-email/verify-new-otp',
            resendUrl: '/profile/change-email/resend-new-otp',
            buttonText: 'Verify & Complete Email Change',
            error: null,
            success: null
        });
    } catch (error) {
        console.error('Get verify new email OTP error:', error);
        res.redirect('/profile/edit');
    }
};

// Step 3 Process: Verify OTP sent to new email & update user profile
export const verifyNewEmailOTP = async (req, res) => {
    try {
        if (!req.session.currentEmailVerified || !req.session.pendingNewEmail) {
            return res.redirect('/profile/change-email/start');
        }

        const { otp1, otp2, otp3, otp4, otp5, otp6 } = req.body;
        const otp = `${otp1}${otp2}${otp3}${otp4}${otp5}${otp6}`;
        const userId = req.session.userId;
        const newEmail = req.session.pendingNewEmail;

        const user = await getUserById(userId);
        if (!user) {
            return res.redirect('/login');
        }

        // Validate OTP format
        const validation = validateOTP(otp);
        if (!validation.isValid) {
            return res.render('user/email-otp-verify', {
                pageTitle: 'Verify New Email',
                emailLabel: 'your new email address',
                targetEmail: newEmail,
                actionUrl: '/profile/change-email/verify-new-otp',
                resendUrl: '/profile/change-email/resend-new-otp',
                buttonText: 'Verify & Complete Email Change',
                error: validation.error,
                success: null
            });
        }

        // Verify OTP validity
        if (!isValid(user, otp)) {
            return res.render('user/email-otp-verify', {
                pageTitle: 'Verify New Email',
                emailLabel: 'your new email address',
                targetEmail: newEmail,
                actionUrl: '/profile/change-email/verify-new-otp',
                resendUrl: '/profile/change-email/resend-new-otp',
                buttonText: 'Verify & Complete Email Change',
                error: 'Invalid or expired OTP. Please try again.',
                success: null
            });
        }

        // Update user email in database
        user.email = newEmail;
        clear(user);
        await saveUser(user);

        // Update session user email
        req.session.user.email = newEmail;

        // Cleanup temporary session data
        delete req.session.pendingNewEmail;
        delete req.session.currentEmailVerified;
        delete req.session.emailChangeStep;

        req.session.emailUpdateSuccess = 'Email address updated successfully!';
        res.redirect('/profile');
    } catch (error) {
        console.error('Verify new email OTP error:', error);
        const newEmail = req.session.pendingNewEmail || '';
        res.render('user/email-otp-verify', {
            pageTitle: 'Verify New Email',
            emailLabel: 'your new email address',
            targetEmail: newEmail,
            actionUrl: '/profile/change-email/verify-new-otp',
            resendUrl: '/profile/change-email/resend-new-otp',
            buttonText: 'Verify & Complete Email Change',
            error: 'Something went wrong. Please try again.',
            success: null
        });
    }
};

// Resend OTP to new email
export const resendNewEmailOTP = async (req, res) => {
    try {
        const userId = req.session.userId;
        const newEmail = req.session.pendingNewEmail;

        if (!newEmail) {
            return sendResponse(res, false, 'No new email verification request found');
        }

        const user = await getUserById(userId);
        if (!user) {
            return sendResponse(res, false, 'User not found');
        }

        const newOTP = generate();
        user.otp = newOTP;
        user.otpExpiry = addMinutes(5);
        await saveUser(user);

        await sendOTP(newEmail, newOTP, user.name);
        sendResponse(res, true, 'OTP resent successfully to your new email address');
    } catch (error) {
        console.error('Resend new email OTP error:', error);
        sendResponse(res, false, 'Failed to resend OTP');
    }
};

export const getChangePasswordPage = async (req, res) => {
    try {
        const user = await getUserById(req.session.userId);
        const hasPassword = user && user.authProvider === 'local';
        res.render('user/change-password', { user, activeTab: 'password', hasPassword, isLoggedIn: true });
    } catch (error) {
        console.error('Get password page error:', error);
        res.redirect('/profile');
    }
};

export const getWalletPage = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await getUserById(userId);
        if (!user) {
            return res.redirect('/login');
        }

        // Generate a referral code on the fly if not exists
        if (!user.referralCode) {
            const cleanName = user.name.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
            user.referralCode = `VELVET-${cleanName || 'USER'}-${randomCode}`;
            await user.save();
        }

        res.render('user/wallet', {
            user,
            activeTab: 'wallet',
            isLoggedIn: true
        });
    } catch (error) {
        console.error('Get wallet page error:', error);
        res.redirect('/profile');
    }
};

export const addMoneyToWallet = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { amount, paymentMethod } = req.body;

        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            return res.json({ success: false, message: 'Please enter a valid amount to top up.' });
        }

        const user = await getUserById(userId);
        if (!user) {
            return res.json({ success: false, message: 'User not found.' });
        }

        // Add transaction and update balance
        user.walletBalance = (user.walletBalance || 0) + numericAmount;
        user.walletHistory.push({
            amount: numericAmount,
            type: 'Credited',
            description: `Top-up via ${paymentMethod || 'Online Payment'}`
        });

        await user.save();

        res.json({
            success: true,
            message: `₹${numericAmount.toFixed(2)} credited to your wallet successfully!`,
            newBalance: user.walletBalance
        });
    } catch (error) {
        console.error('Add money to wallet error:', error);
        res.json({ success: false, message: 'Failed to process top-up. Please try again.' });
    }
};


 