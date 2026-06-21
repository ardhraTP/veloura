import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({

    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    variant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Variant'
    },
    quantity: {
        type: Number,
        required: true,
        default: 1
    },
    price: {
        type: Number,
        required: true
    }
});

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    items: [cartItemSchema],

    totalAmount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;