import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    color: {
        type: String,
        required: true,
        trim: true
    },
    hexCode: {
        type: String,
        trim: true,
        default: ''
    },
    images: [{
        type: String,
        required: true
    }],
    quantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    regularPrice: {
        type: Number,
        required: true,
        min: 0
    },
    salePrice: {
        type: Number,
        required: true,
        min: 0
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE'],
        default: 'ACTIVE'
    }
}, {
    timestamps: true
});

variantSchema.pre('save', async function() {
    if (this.salePrice > this.regularPrice) {
        throw new Error('Sale price cannot be greater than regular price');
    }
});

const Variant = mongoose.model('Variant', variantSchema);

export default Variant;
