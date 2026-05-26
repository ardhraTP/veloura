import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profileImage: { type: String, default: null },
    googleId: { type: String, default: null },
    facebookId: { type: String, default: null },
    isVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    otp: { type: String, default: null },
    otpExpiry: { type: Date, default: null },
    resetToken: { type: String, default: null },
    resetExpiry: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
