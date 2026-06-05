import { generateOTP } from '../utils/helpers.js';

export const generate = () => generateOTP();

export const isValid = (user, otp) => {
    return user.otpExpiry > new Date() && user.otp === otp;;
};


export const clear = (user) => {
    user.otp = null;
    user.otpExpiry = null;
};
