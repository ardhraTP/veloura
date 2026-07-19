import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    offer: {
        type: String,
        trim: true,
        default: ''
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    isListed: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    categoryDiscount: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    categoryOfferExpiry: {
        type: Date,
        default: null
    }
}, {
    timestamps: true 
});

const category = mongoose.model('Category',categorySchema);

export default category;