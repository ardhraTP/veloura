import bcrypt from 'bcryptjs';


export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isValidPhone = (phone) => /^[0-9]{10}$/.test(phone);

export const isValidPassword = (password) => {
    if (!password || password.length < 8) return false;
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
};

export const isValidName = (name) => {
    if (!name || name.trim().length < 2) return false;
    if (name.trim().length > 50) return false;
    return /^[a-zA-Z\s]+$/.test(name.trim());
};

export const isValidPincode = (pincode) => /^[0-9]{6}$/.test(pincode);

export const isValidCity = (city) => {
    if (!city || city.trim().length < 2) return false;
    if (city.trim().length > 50) return false;
    return /^[a-zA-Z\s]+$/.test(city.trim());
};

export const isValidState = (state) => {
    if (!state || state.trim().length < 2) return false;
    if (state.trim().length > 50) return false;
    return /^[a-zA-Z\s]+$/.test(state.trim());
};

export const isValidAddress = (address) => {
    if (!address || address.trim().length < 10) return false;
    if (address.trim().length > 200) return false;
    return true;
};


export const hashPassword = async (password) => await bcrypt.hash(password, 12);

export const comparePassword = async (password, hash) => await bcrypt.compare(password, hash);


export const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const generateToken = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);


export const sendResponse = (res, success, message, data = null, statusCode = 200) => {
    res.status(statusCode).json({ success, message, data });
};


export const addMinutes = (minutes) => new Date(Date.now() + minutes * 60000);


export const getPasswordRequirements = () => {
    return 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character';
};


export const validateSignup = (data) => {
    const errors = [];
    if (!isValidName(data.name)) errors.push('Name must be 2-50 characters and contain only letters');
    if (!isValidEmail(data.email)) errors.push('Invalid email format');
    if (!isValidPhone(data.phone)) errors.push('Phone must be 10 digits');
    if (!isValidPassword(data.password)) errors.push(getPasswordRequirements());
    return errors;
};

export const validateAddress = (data) => {
    const errors = [];
    if (!isValidName(data.fullName)) errors.push('Full name must be 2-50 characters and contain only letters');
    if (!isValidPhone(data.phone)) errors.push('Phone must be 10 digits');
    if (!isValidPincode(data.pincode)) errors.push('Pincode must be 6 digits');
    if (!isValidAddress(data.address)) errors.push('Address must be 10-200 characters');
    if (!isValidCity(data.city)) errors.push('City must be 2-50 characters and contain only letters');
    if (!isValidState(data.state)) errors.push('State must be 2-50 characters and contain only letters');
    if (!['home', 'work'].includes(data.addressType)) errors.push('Invalid address type');
    return errors;
};
