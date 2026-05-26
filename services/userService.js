import User from '../model/user.js';
import { isValidEmail, isValidPhone, isValidPassword } from '../utils/helpers.js';

// Validate signup data
export const validateSignupData = (data) => {
    const { name, email, phone, password } = data;

    if (!name || name.trim().length < 2) {
        return { isValid: false, error: 'Name must be at least 2 characters' };
    }

    if (!isValidEmail(email)) {
        return { isValid: false, error: 'Please enter a valid email' };
    }

    if (!isValidPhone(phone)) {
        return { isValid: false, error: 'Phone number must be 10 digits' };
    }

    if (!isValidPassword(password)) {
        return { isValid: false, error: 'Password must be at least 8 characters' };
    }

    return { isValid: true };
};

// Validate login data
export const validateLoginData = (data) => {
    const { email, password } = data;

    if (!email || !password) {
        return { isValid: false, error: 'Please enter email and password' };
    }

    if (!isValidEmail(email)) {
        return { isValid: false, error: 'Please enter a valid email' };
    }

    return { isValid: true };
};

// Validate profile update data
export const validateProfileData = (data) => {
    const { name, phone } = data;

    if (!name || name.trim().length < 2) {
        return { isValid: false, error: 'Name must be at least 2 characters' };
    }

    if (!isValidPhone(phone)) {
        return { isValid: false, error: 'Phone number must be 10 digits' };
    }

    return { isValid: true };
};

// Validate password change data
export const validatePasswordChange = (data) => {
    const { currentPassword, newPassword, confirmPassword } = data;

    if (!currentPassword) {
        return { isValid: false, error: 'Current password is required' };
    }

    if (!newPassword) {
        return { isValid: false, error: 'New password is required' };
    }

    if (!confirmPassword) {
        return { isValid: false, error: 'Please confirm your new password' };
    }

    if (newPassword.length < 8) {
        return { isValid: false, error: 'New password must be at least 8 characters' };
    }

    if (newPassword !== confirmPassword) {
        return { isValid: false, error: 'New passwords do not match' };
    }

    return { isValid: true };
};

// Validate email change data
export const validateEmailChange = (data) => {
    const { newEmail } = data;

    if (!newEmail) {
        return { isValid: false, error: 'Please enter new email' };
    }

    if (!isValidEmail(newEmail)) {
        return { isValid: false, error: 'Please enter a valid email' };
    }

    return { isValid: true };
};

// Validate OTP
export const validateOTP = (otp) => {
    if (!otp || otp.length !== 6) {
        return { isValid: false, error: 'Please enter a valid 6-digit OTP' };
    }

    return { isValid: true };
};

// Check if email exists
export const checkEmailExists = async (email, excludeUserId = null) => {
    const query = { email: email.toLowerCase() };
    if (excludeUserId) {
        query._id = { $ne: excludeUserId };
    }
    
    const user = await User.findOne(query);
    return user !== null;
};

// Check if phone exists
export const checkPhoneExists = async (phone, excludeUserId = null) => {
    const query = { phone: phone.trim() };
    if (excludeUserId) {
        query._id = { $ne: excludeUserId };
    }
    
    const user = await User.findOne(query);
    return user !== null;
};

// Get user by email
export const getUserByEmail = async (email) => {
    return await User.findOne({ email: email.toLowerCase() });
};

// Get user by ID
export const getUserById = async (id) => {
    return await User.findById(id);
};

// Get user by reset token
export const getUserByResetToken = async (token) => {
    return await User.findOne({ resetToken: token });
};
