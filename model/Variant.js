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
    }
}, {
    timestamps: true
});

// Validation: salePrice should be less than or equal to regularPrice
variantSchema.pre('save', function(next) {
    if (this.salePrice > this.regularPrice) {
        next(new Error('Sale price cannot be greater than regular price'));
    }
    next();
});

const Variant = mongoose.model('Variant', variantSchema);

export default Variant;
