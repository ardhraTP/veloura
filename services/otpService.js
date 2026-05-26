import { generateOTP } from '../utils/helpers.js';

export const generate = () => generateOTP();

export const isValid = (user, otp) => {
    return user.otp === otp && user.otpExpiry > new Date();
};

export const clear = (user) => {
    user.otp = null;
    user.otpExpiry = null;
};
