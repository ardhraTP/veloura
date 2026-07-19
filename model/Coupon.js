import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    name: {
        type: String,
        default: ''
    },
    description:{
        type:String,
        required:true
    },
    discountType:{
        type:String,
        enum:['PERCENTAGE','FIXED'],
        required:true
    },
    discountValue:{
        type:Number,
        required:true,
        min:0
    },
    minOrderAmount:{
        type:Number,
        default:0
    },
    maxDiscountAmount:{
        type:Number,
        default:null
    },
    startDate:{
        type:Date,
        required:true
    },
    endDate:{
        type:Date,
        required:true
    },
    usageLimit:{
        type:Number,
        default:null
    },
    usedCount:{
        type:Number,
        default:0
    },
    userUsageLimit:{
        type:Number,
        default:1
    },
    isActive:{
        type:Boolean,
        default:true
    },
    applicableCategories:[{
        type: mongoose.Schema.Types.ObjectId,
        ref:'Category'
    }],
    applicableProducts:[{
        type: mongoose.Schema.Types.ObjectId,
        ref:'Product'
    }]
},{
    timestamps:true
});

const Coupon = mongoose.model('Coupon',couponSchema);
export default Coupon;
