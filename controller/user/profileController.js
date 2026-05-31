import User from '../../model/User.js'
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
    getUserById 
} from '../../services/userService.js';

// Show profile page
export const getProfile = async (req, res) => {
    try {
        const user = await getUserById(req.session.userId);
        if (!user) {
            return res.redirect('/login');
        }
        
        // Check for email update success message from session
        const emailUpdateSuccess = req.session.emailUpdateSuccess;
        delete req.session.emailUpdateSuccess; // Clear it after reading
        
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

// Show edit profile page
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
        
        // Check for success message from session
        const successMessage = req.session.profileUpdateSuccess;
        delete req.session.profileUpdateSuccess; // Clear it after reading
        
        console.log('Success message from session:', successMessage);
        
        // Always start with clean state - no error messages on GET
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

// Update profile
export const updateProfile = async (req, res) => {
    try {
        const { name, phone, deleteProfileImage } = req.body;
        const userId = req.session.userId;

        const currentUser = await getUserById(userId);
        if (!currentUser) return res.redirect('/login');

        const validation = validateProfileData({ name, phone });
        if (!validation.isValid) {
            // Clean up temp file if validation fails
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

        // Handle image upload to Cloudinary
        if (req.file) {
            try {
                const result = await cloudinary.uploader.upload(req.file.path, {
                    folder: 'veloura/profiles',
                    public_id: `profile_${userId}_${Date.now()}`
                });
                updateData.profileImage = result.secure_url;

                // Delete temp file
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

        // Handle image removal
        if (deleteProfileImage === 'true') {
            updateData.profileImage = null;
        }

        await User.updateOne({ _id: userId }, { $set: updateData });

        const updatedUser = await User.findById(userId).select('-password');
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
// Upload profile image
export const uploadProfileImage = async (req, res) => {
    try {
        const userId = req.session.userId;
        
        if (!req.file) {
            return sendResponse(res, false, 'Please select an image');
        }

        const tempFilePath = req.file.path;

        // Upload to Cloudinary using unsigned preset
        const result = await cloudinary.uploader.upload(tempFilePath, {
            upload_preset: 'ml_default',
            folder: 'veloura/profiles',
            public_id: `profile_${userId}_${Date.now()}`
        });

        console.log('Cloudinary upload successful:', result.secure_url);

        // Delete temporary file after successful upload
        try {
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
                console.log('Temp file deleted:', tempFilePath);
            }
        } catch (err) {
            console.log('Error deleting temp file:', err);
        }

        // Update user profile image URL
        await User.findByIdAndUpdate(userId, {
            profileImage: result.secure_url
        });

        // Update session
        if (req.session.user) {
            req.session.user.profileImage = result.secure_url;
        }

        sendResponse(res, true, 'Profile image updated successfully', {
            imageUrl: result.secure_url
        });

    } catch (error) {
        console.error('Upload image error:', error);
        
        // Clean up temp file on error
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

// Change password
export const changePassword = async (req, res) => {
    try {
        const passwordData = req.body;
        const userId = req.session.userId;

        // Validate using service
        const validation = validatePasswordChange(passwordData);
        if (!validation.isValid) {
            return sendResponse(res, false, validation.error);
        }

        // Get user from database
        const user = await getUserById(userId);
        if (!user) {
            return sendResponse(res, false, 'User not found');
        }

        // Verify current password
        const isCurrentPasswordCorrect = await comparePassword(passwordData.currentPassword, user.password);
        if (!isCurrentPasswordCorrect) {
            return sendResponse(res, false, 'Current password is incorrect');
        }

        // Update password
        const hashedNewPassword = await hashPassword(passwordData.newPassword);
        user.password = hashedNewPassword;
        await user.save();

        sendResponse(res, true, 'Password changed successfully');

    } catch (error) {
        console.error('Change password error:', error);
        sendResponse(res, false, 'Something went wrong');
    }
};

// Request email change
export const requestEmailChange = async (req, res) => {
    try {
        const { newEmail } = req.body;
        const userId = req.session.userId;

        // Validate using service
        const validation = validateEmailChange({ newEmail });
        if (!validation.isValid) {
            return sendResponse(res, false, validation.error);
        }

        // Check if email already exists using service
        const emailExists = await checkEmailExists(newEmail, userId);
        if (emailExists) {
            return sendResponse(res, false, 'Email already exists');
        }

        // Get current user
        const user = await getUserById(userId);
        if (!user) {
            return sendResponse(res, false, 'User not found');
        }

        // Generate OTP for email verification
        const otp = generate();
        user.otp = otp;
        user.otpExpiry = addMinutes(5); // 5 minutes expiry
        await user.save();

        // Store new email in session
        req.session.newEmail = newEmail.toLowerCase().trim();

        try {
            // Send OTP to new email
            await sendOTP(newEmail, otp, user.name);
            
            // Redirect to OTP verification page instead of sending JSON response
            res.redirect('/profile/verify-email-otp');
        } catch (emailError) {
            console.error('Failed to send email OTP:', emailError);
            
            // Clear the session data if email fails
            delete req.session.newEmail;
            
            return sendResponse(res, false, 'Failed to send verification email. Please try again.');
        }

    } catch (error) {
        console.error('Request email change error:', error);
        sendResponse(res, false, 'Something went wrong');
    }
};

// Show email OTP verification page
export const getEmailOTPVerify = async (req, res) => {
    try {
        const newEmail = req.session.newEmail;
        
        if (!newEmail) {
            return res.redirect('/profile/edit');
        }
        
        res.render('user/email-otp-verify', { 
            newEmail,
            error: null, 
            success: null 
        });
    } catch (error) {
        console.error('Get email OTP verify error:', error);
        res.redirect('/profile/edit');
    }
};

// Verify email change
export const verifyEmailChange = async (req, res) => {
    try {
        const { otp1, otp2, otp3, otp4, otp5, otp6 } = req.body;
        const otp = `${otp1}${otp2}${otp3}${otp4}${otp5}${otp6}`;
        const userId = req.session.userId;
        const newEmail = req.session.newEmail;

        // Check if email change request exists
        if (!newEmail) {
            return res.render('user/email-otp-verify', { 
                newEmail: '', 
                error: 'No email change request found. Please try again.',
                success: null 
            });
        }

        // Validate OTP using service
        const validation = validateOTP(otp);
        if (!validation.isValid) {
            return res.render('user/email-otp-verify', { 
                newEmail,
                error: validation.error,
                success: null 
            });
        }

        // Get user
        const user = await getUserById(userId);
        if (!user) {
            return res.render('user/email-otp-verify', { 
                newEmail,
                error: 'User not found',
                success: null 
            });
        }

        // Verify OTP
        if (!isValid(user, otp)) {
            return res.render('user/email-otp-verify', { 
                newEmail,
                error: 'Invalid or expired OTP',
                success: null 
            });
        }

        // Update email
        user.email = newEmail;
        clear(user); // Clear OTP data
        await user.save();

        // Update session
        req.session.user.email = newEmail;
        delete req.session.newEmail;

        // Set success message and redirect to profile
        req.session.emailUpdateSuccess = 'Email updated successfully';
        res.redirect('/profile');

    } catch (error) {
        console.error('Verify email change error:', error);
        const newEmail = req.session.newEmail || '';
        res.render('user/email-otp-verify', { 
            newEmail,
            error: 'Something went wrong. Please try again.',
            success: null 
        });
    }
};

// Resend email OTP
export const resendEmailOTP = async (req, res) => {
    try {
        const userId = req.session.userId;
        const newEmail = req.session.newEmail;
        
        if (!newEmail) {
            return sendResponse(res, false, 'No email change request found');
        }

        const user = await getUserById(userId);
        if (!user) {
            return sendResponse(res, false, 'User not found');
        }

        // Generate new OTP
        const newOTP = generate();
        user.otp = newOTP;
        user.otpExpiry = addMinutes(5); // 5 minutes expiry
        await user.save();

        try {
            // Send new OTP
            await sendOTP(newEmail, newOTP, user.name);
            sendResponse(res, true, 'New OTP sent successfully');
        } catch (emailError) {
            console.error('Failed to resend email OTP:', emailError);
            sendResponse(res, false, 'Failed to send OTP. Please try again.');
        }

    } catch (error) {
        console.error('Resend email OTP error:', error);
        sendResponse(res, false, 'Failed to send OTP');
    }
};
