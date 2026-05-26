import bcrypt from 'bcryptjs';

// Validation functions
export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isValidPhone = (phone) => /^[0-9]{10}$/.test(phone);

export const isValidPassword = (password) => password && password.length >= 8;

export const isValidPincode = (pincode) => /^[0-9]{6}$/.test(pincode);

// Password functions
export const hashPassword = async (password) => await bcrypt.hash(password, 12);

export const comparePassword = async (password, hash) => await bcrypt.compare(password, hash);

// OTP and Token functions
export const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const generateToken = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Response function
export const sendResponse = (res, success, message, data = null, statusCode = 200) => {
    res.status(statusCode).json({ success, message, data });
};

// Date function
export const addMinutes = (minutes) => new Date(Date.now() + minutes * 60000);

// Validation for forms
export const validateSignup = (data) => {
    const errors = [];
    if (!data.name || data.name.trim().length < 2) errors.push('Name must be at least 2 characters');
    if (!isValidEmail(data.email)) errors.push('Invalid email format');
    if (!isValidPhone(data.phone)) errors.push('Phone must be 10 digits');
    if (!isValidPassword(data.password)) errors.push('Password must be at least 8 characters');
    return errors;
};

export const validateAddress = (data) => {
    const errors = [];
    if (!data.fullName || data.fullName.trim().length < 2) errors.push('Full name is required');
    if (!isValidPhone(data.phone)) errors.push('Invalid phone number');
    if (!isValidPincode(data.pincode)) errors.push('Invalid pincode');
    if (!data.address || data.address.trim().length < 10) errors.push('Address too short');
    if (!data.city || data.city.trim().length < 2) errors.push('City is required');
    if (!data.state || data.state.trim().length < 2) errors.push('State is required');
    if (!['home', 'work'].includes(data.addressType)) errors.push('Invalid address type');
    return errors;
};
