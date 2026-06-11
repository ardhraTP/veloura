import User from '../model/User.js';
import { isValidEmail, isValidPhone, isValidPassword, isValidName, getPasswordRequirements } from '../utils/helpers.js';


export const validateSignupData = (data) => {
    const { name, email,phone, password } = data;

    if (!isValidName(name)) {
        return { isValid: false, error: 'Name must be 2-50 characters and contain only letters' };
    }

    if (!isValidEmail(email)) {
        return { isValid: false, error: 'Please enter a valid email' };
    }

    if (!isValidPhone(phone)) {
        return { isValid: false, error: 'Phone number must be 10 digits' };
    }

    if (!isValidPassword(password)) {
        return { isValid: false, error: getPasswordRequirements() };
    }

    return { isValid: true };
};


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


export const validateProfileData = (data) => {
    const { name, phone } = data;

    if (!isValidName(name)) {
        return { isValid: false, error: 'Name must be 2-50 characters and contain only letters' };
    }

    if (!isValidPhone(phone)) {
        return { isValid: false, error: 'Phone number must be 10 digits' };
    }

    return { isValid: true };
};


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

    if (!isValidPassword(newPassword)) {
        return { isValid: false, error: getPasswordRequirements() };
    }

    if (newPassword !== confirmPassword) {
        return { isValid: false, error: 'New passwords do not match' };
    }

    if (currentPassword === newPassword) {
        return { isValid: false, error: 'New password must be different from current password' };
    }

    return { isValid: true };
};

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


export const validateOTP = (otp) => {
    if (!otp || otp.length !== 6) {
        return { isValid: false, error: 'Please enter a valid 6-digit OTP' };
    }

    return { isValid: true };
};


export const checkEmailExists = async (email, excludeUserId = null) => {
    const query = { email: email.toLowerCase() };
    if (excludeUserId) {
        query._id = { $ne: excludeUserId };
    }
    
    const user = await User.findOne(query);
    return user !== null;
};


export const checkPhoneExists = async (phone, excludeUserId = null) => {
    const query = { phone: phone.trim() };
    if (excludeUserId) {
        query._id = { $ne: excludeUserId };
    }
    
    const user = await User.findOne(query);
    return user !== null;
};


export const getUserByEmail = async (email) => {
    return await User.findOne({ email: email.toLowerCase() });
};


export const getUserById = async (id) => {
    return await User.findById(id);
};


export const getUserByResetToken = async (token) => {
    return await User.findOne({ resetToken: token });
};


export const updateUserProfile = async (userId, updateData) => {
    return await User.updateOne({ _id: userId }, { $set: updateData });
};


export const updateUserProfileImage = async (userId, imageUrl) => {
    return await User.findByIdAndUpdate(userId, {
        profileImage: imageUrl
    }, { new: true });
};


export const saveUser = async (user) => {
    return await user.save();
};

