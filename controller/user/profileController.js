import User from '../../model/user.js';
import { hashPassword, comparePassword, sendResponse, addMinutes } from '../../utils/helpers.js';
import { sendOTP } from '../../services/emailService.js';
import { generate, isValid, clear } from '../../services/otpService.js';
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
        res.render('user/profile', { user, activeTab: 'profile' });
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
        
        console.log('=== GET EDIT PROFILE DEBUG ===');
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
          console.log("work")
        const { name, phone } = req.body;
        const userId = req.session.userId;

        console.log('=== PROFILE UPDATE DEBUG ===');
        console.log('Request body:', req.body);
        console.log('Request file:', req.file);
        console.log('User ID:', userId);
        console.log('Name received:', name);
        console.log('Phone received:', phone);

        // Get current user
        const currentUser = await getUserById(userId);
        if (!currentUser) {
            console.log('User not found, redirecting to login');
            return res.redirect('/login');
        }

        console.log('Current user before update:', {
            id: currentUser._id,
            name: currentUser.name,
            phone: currentUser.phone
        });

        // Validate using service
        const validation = validateProfileData({ name, phone });
        console.log('Validation result:', validation);
        
        if (!validation.isValid) {
            console.log('Validation failed, rendering with error');
            return res.render('user/edit-profile', { 
                user: currentUser, 
                error: validation.error,
                success: null,
                activeTab: 'profile'
            });
        }

        // Check if phone is already used by another user
        const phoneExists = await checkPhoneExists(phone, userId);
        if (phoneExists) {
            console.log('Phone already exists for another user');
            return res.render('user/edit-profile', { 
                user: currentUser, 
                error: 'Phone number already exists',
                success: null,
                activeTab: 'profile'
            });
        }

        // Update user profile
        console.log('Attempting to update user with:', {
            name: name.trim(),
            phone: phone.trim()
        });

        // First, let's try a direct update to see if it works
        const updateResult = await User.updateOne(
            { _id: userId },
            { 
                $set: {
                    name: name.trim(),
                    phone: phone.trim()
                }
            }
        );

        console.log('Update result:', updateResult);

        // Now get the updated user
        const updatedUser = await User.findById(userId).select('-password');

        console.log('User after update:', {
            id: updatedUser._id,
            name: updatedUser.name,
            phone: updatedUser.phone
        });

        // Update session data
        req.session.user.name = updatedUser.name;
        console.log('Session updated with new name:', req.session.user.name);

        // Set success message and redirect
        req.session.profileUpdateSuccess = 'Profile updated successfully';
        console.log('Redirecting to /profile/edit');
        res.redirect('/profile/edit');

    } catch (error) {
        console.error('Update profile error:', error);
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

        // Here you would upload to Cloudinary
        // For now, just return success
        sendResponse(res, true, 'Image upload feature coming soon');

    } catch (error) {
        console.error('Upload image error:', error);
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
        const emailData = req.body;
        const userId = req.session.userId;

        // Validate using service
        const validation = validateEmailChange(emailData);
        if (!validation.isValid) {
            return sendResponse(res, false, validation.error);
        }

        // Check if email already exists using service
        const emailExists = await checkEmailExists(emailData.newEmail, userId);
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
        user.otpExpiry = addMinutes(5);
        await user.save();

        // Store new email in session
        req.session.newEmail = emailData.newEmail.toLowerCase().trim();

        // Send OTP to new email
        await sendOTP(emailData.newEmail, otp, user.name);

        sendResponse(res, true, 'OTP sent to new email address');

    } catch (error) {
        console.error('Request email change error:', error);
        sendResponse(res, false, 'Something went wrong');
    }
};

// Verify email change
export const verifyEmailChange = async (req, res) => {
    try {
        const { otp } = req.body;
        const userId = req.session.userId;
        const newEmail = req.session.newEmail;

        // Check if email change request exists
        if (!newEmail) {
            return sendResponse(res, false, 'No email change request found');
        }

        // Validate OTP using service
        const validation = validateOTP(otp);
        if (!validation.isValid) {
            return sendResponse(res, false, validation.error);
        }

        // Get user
        const user = await getUserById(userId);
        if (!user) {
            return sendResponse(res, false, 'User not found');
        }

        // Verify OTP
        if (!isValid(user, otp)) {
            return sendResponse(res, false, 'Invalid or expired OTP');
        }

        // Update email
        user.email = newEmail;
        clear(user);
        await user.save();

        // Update session
        req.session.user.email = newEmail;
        delete req.session.newEmail;

        sendResponse(res, true, 'Email updated successfully');

    } catch (error) {
        console.error('Verify email change error:', error);
        sendResponse(res, false, 'Something went wrong');
    }
};
