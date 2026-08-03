// model/Order.js
import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    deliveryAddress: {
        fullName: { type: String, required: true },
        phone: { type: String, required: true },
        address: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        addressType: { type: String, required: true }
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        variant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Variant',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        },
        itemStatus: {
            type: String,
            enum: ['Ordered', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned', 'Return Requested', 'Return Rejected'],
            default: 'Ordered'
        },
        cancellationReason: {
            type: String
        },
        returnReason: {
            type: String
        },
        returnRejectionReason: {
            type: String
        }
    }],
    subtotal: {
        type: Number,
        required: true
    },
    shippingFee: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    tax: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['COD', 'Online', 'Wallet'],
        default: 'COD'
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed', 'Refunded', 'Partially Refunded'],
        default: 'Pending'
    },
    razorpayOrderId: {
        type: String
    },
    razorpayPaymentId: {
        type: String
    },
    razorpaySignature: {
        type: String
    },
    paymentDetails: {
        method: String,
        email: String,
        contact: String,
        bank: String,
        wallet: String,
        vpa: String
    },
    orderStatus: {
        type: String,
        enum: ['Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned', 'Return Requested', 'Return Rejected'],
        default: 'Pending'
    },
    cancellationReason: {
        type: String
    },
    returnReason: {
        type: String
    }
}, {
    timestamps: true
});

const Order = mongoose.model('Order', orderSchema);

export default Order;

