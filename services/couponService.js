import Coupon from '../model/Coupon.js';
import Order from '../model/Order.js';

export const getActiveCoupons = async ()=>{
    try{
        const now = new Date();
        const coupons = await Coupon.find({
            isActive:true,
            startDate:{$lte: now},
            endDate:{$gte: now}
        });
        return coupons;
    }catch(error){
        console.error('Error getting active coupons:',error);
        throw error;
    }
};


//validate coupon code
export const validateCoupon = async (couponCode,userId,cartTotal,cartItems)=>{
    try{
        const coupon = await Coupon.findOne({
            code:couponCode.toUpperCase(),
            isActive:true
        });

        if(!coupon){
            return {valid:false, message:'Invalid coupon code'};
        }

        const now = new Date();

        if(coupon.startDate > now){
            return {valid:false,message:'Coupon not yet valid'};
        }

        if(coupon.endDate < now){
            return {valid:false, message:'Coupon has expired'};
        }

        if(coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit){
            return {valid:false, message:'Coupon usage limit reached'};
        }

        const userUsageCount = await Order.countDocuments({
            user:userId,
            'coupon.code' : couponCode.toUpperCase(),
            orderStatus: { $ne: 'Cancelled' },
            paymentStatus: { $ne: 'Failed' }
        });

        if(userUsageCount >= coupon.userUsageLimit){
            return {valid:false,message:'You have already used this coupon'};
        }

        if(cartTotal < coupon.minOrderAmount){
            return{
                valid:false,
                message:`'Minimum order amount of ₹${coupon.minOrderAmount} required`
            };
        }

        let discountAmount = 0;
        if(coupon.discountType === 'PERCENTAGE'){
            discountAmount = (cartTotal * coupon.discountValue) / 100;


            if(coupon.maxDiscountAmount !== null && discountAmount > coupon.maxDiscountAmount){
                discountAmount = coupon.maxDiscountAmount;
            }
        }else if(coupon.discountType === 'FIXED'){
            discountAmount = coupon.discountValue;
        }

        return {
            valid:true,
            coupon:coupon,
            discountAmount:Math.round(discountAmount)
        };
    }catch(error){
        console.error('Error validating coupon:',error);
        throw error;
    }
};


export const applyCoupon = async (couponCode)=>{
    try{
        const coupon = await Coupon.findOneAndUpdate(
           { code: couponCode.toUpperCase() },
           {$inc: {usedCount: 1}},
           {new: true}
        );
        return coupon;
    }catch(error){
        console.error('Error applying coupon:',error);
        throw error;
    }
};


export const getCouponCode = async (couponCode)=>{
    try{
        const coupon = await Coupon.findOne({
            code:couponCode.toUpperCase()
        });
        return coupon;
    }catch(error){
        console.error('Error getting coupon:',error);
        throw error;
    }
};