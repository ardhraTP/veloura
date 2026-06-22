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


export const requestEmailChange = async (req, res) => {
    try {
        const { newEmail } = req.body;
        const userId = req.session.userId;


        const validation = validateEmailChange({ newEmail });
        if (!validation.isValid) {
            return sendResponse(res, false, validation.error);
        }

        const emailExists = await checkEmailExists(newEmail, userId);
        if (emailExists) {
            return sendResponse(res, false, 'Email already exists');
        }


        const user = await getUserById(userId);
        if (!user) {
            return sendResponse(res, false, 'User not found');
        }

        const otp = generate();
        user.otp = otp;
        user.otpExpiry = addMinutes(5);
        await saveUser(user);


        req.session.newEmail = newEmail.toLowerCase().trim();

        try {

            await sendOTP(newEmail, otp, user.name);


            res.redirect('/profile/verify-email-otp');
        } catch (emailError) {
            console.error('Failed to send email OTP:', emailError);


            delete req.session.newEmail;

            return sendResponse(res, false, 'Failed to send verification email. Please try again.');
        }

    } catch (error) {
        console.error('Request email change error:', error);
        sendResponse(res, false, 'Something went wrong');
    }
};


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


export const verifyEmailChange = async (req, res) => {
    try {
        const { otp1, otp2, otp3, otp4, otp5, otp6 } = req.body;
        const otp = `${otp1}${otp2}${otp3}${otp4}${otp5}${otp6}`;
        const userId = req.session.userId;
        const newEmail = req.session.newEmail;


        if (!newEmail) {
            return res.render('user/email-otp-verify', {
                newEmail: '',
                error: 'No email change request found. Please try again.',
                success: null
            });
        }


        const validation = validateOTP(otp);
        if (!validation.isValid) {
            return res.render('user/email-otp-verify', {
                newEmail,
                error: validation.error,
                success: null
            });
        }


        const user = await getUserById(userId);
        if (!user) {
            return res.render('user/email-otp-verify', {
                newEmail,
                error: 'User not found',
                success: null
            });
        }


        if (!isValid(user, otp)) {
            return res.render('user/email-otp-verify', {
                newEmail,
                error: 'Invalid or expired OTP',
                success: null
            });
        }


        user.email = newEmail;
        clear(user);
        await saveUser(user);


        req.session.user.email = newEmail;
        delete req.session.newEmail;


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


        const newOTP = generate();
        user.otp = newOTP;
        user.otpExpiry = addMinutes(5);
        await saveUser(user);

        try {

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

export const getChangePasswordPage = async (req, res) => {
    try {
        const user = await getUserById(req.session.userId);
        const hasPassword = user && user.authProvider === 'local';
        res.render('user/change-password', { activeTab: 'password', hasPassword });
    } catch (error) {
        console.error('Get password page error:', error);
        res.redirect('/profile');
    }
};


 