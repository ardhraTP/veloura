import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    profileImage: {
        type: String,
        default: null
    },
    googleId: {
        type: String,
        default: null
    },
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    otp: {
        type: String,
        default: null
    },
    otpExpiry: {
        type: Date,
        default: null
    },
    resetToken: {
        type: String,
        default: null
    },
    resetExpiry: {
        type: Date,
        default: null
    },
    walletBalance: {
        type: Number,
        default: 0
    },
    walletHistory: [{
        amount: { type: Number, required: true },
        type: { type: String, enum: ['Credited', 'Debited'], required: true },
        description: { type: String },
        orderId: { type: String },
        date: { type: Date, default: Date.now }
    }],
    referralCode: {
        type: String,
        default: null
    },
    referralEarnings: {
        type: Number,
        default: 0
    },
    referredCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
