import { parse } from 'dotenv';
import Coupon from '../../model/Coupon.js';


export const getCouponsPage = async (req, res) => {
    try {
        const search = req.query.search || '';
        const status = req.query.status || 'all';
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const filter = {};

        if (search) {
            // Escape regex special characters so searching for '*' or other regex symbols doesn't cause a 500 error
            const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.$or = [
                { code: { $regex: safeSearch, $options: 'i' } },
                { name: { $regex: safeSearch, $options: 'i' } },
                { description: { $regex: safeSearch, $options: 'i' } }
            ];
        }

       
        if (status === 'active') {
            filter.isActive = true;
        } else if (status === 'inactive') {
            filter.isActive = false;
        }

        const totalCoupons = await Coupon.countDocuments(filter);
        const totalPages = Math.ceil(totalCoupons / limit);

        const coupons = await Coupon.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const successMessage = req.session.success || null;
        const errorMessage = req.session.error || null;
        delete req.session.success;
        delete req.session.error;

        res.render('admin/coupons', {
            coupons: coupons,
            currentPage: page,
            totalPages: totalPages,
            search: search,
            status: status,
            successMessage: successMessage,
            errorMessage: errorMessage
        });
    } catch (error) {
        console.error('Error in getCouponsPage:', error);
        res.status(500).render('error/500');
    }
};

// Add new coupon
export const addCoupon = async (req, res) => {
    try {
        const {
            name,
            code,
            discountValue,
            minOrderAmount,
            maxDiscountAmount,
            startDate,
            endDate,
            usageLimit,
            description
        } = req.body;



        if(!name || !name.trim()){
            req.session.error = 'Coupon Name is required.';
            return res.redirect('/admin/coupons');
        }

        if(!code || !code.trim()){
            req.session.error = 'Coupon Code is required.';
            return res.redirect('/admin/coupons');
        }

        const cleanCode = code.trim().toUpperCase();

        const parsedDiscount = parseFloat(discountValue);
        if(isNaN(parsedDiscount) || parsedDiscount < 1 || parsedDiscount > 100 ){
            req.session.error = 'Discount percentage must be between 1 and 100.';
            return res.redirect('/admin/coupons');
        }

        const start =  new Date(startDate);
        const end = new Date(endDate);

        if(isNaN(start.getTime()) || isNaN(end.getTime())){
            req.session.error = 'Please select valid dates.';
            return res.redirect('/admin/coupons');
        }

        if(end < start){
            req.session.error = 'Expiry date cannot be earlier than start date.';
            return res.redirect('/admin/coupons');
        }

        const parsedMinOrder = parseFloat(minOrderAmount) || 0;
        if(parsedMinOrder < 0){
            req.session.error = 'Minimum purchase amount cannot be negative.';
            return res.redirect('/admin/coupons');
        }

        const parsedMaxDiscount  = maxDiscountAmount ? parseFloat(maxDiscountAmount) : null;
        if(parsedMaxDiscount !== null && parsedMaxDiscount < 0){
            req.session.error = 'Maximum discount amount cannot be negative.';
            return res.redirect('/admin/coupons');
        }

        const parsedUsageLimit = usageLimit ? parseInt(usageLimit) : null;
        if(parsedUsageLimit !== null && parsedUsageLimit <= 0){
            req.session.error = 'Usage limit must be a positive number.';
            return res.redirect('/admin/coupons');
        }

        const existingCoupon = await Coupon.findOne({
            code: cleanCode
        });

        if(existingCoupon){
            req.session.error = 'Coupon code already exists. Please choose a unique code.';
            return res.redirect('/admin/coupons');
        }



        const newCoupon = new Coupon({
            name: name.trim(),
            code: cleanCode,
            discountType: 'PERCENTAGE',
            discountValue: parseFloat(discountValue),
            minOrderAmount: parseFloat(minOrderAmount) || 0,
            maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            usageLimit: usageLimit ? parseInt(usageLimit) : null,
            description: description.trim(),
            isActive: true
        });

        await newCoupon.save();

        req.session.success = 'Coupon added successfully';
        res.redirect('/admin/coupons');
    } catch (error) {
        console.error('Error in addCoupon:', error);
        req.session.error = 'Error adding coupon';
        res.redirect('/admin/coupons');
    }
};

// Edit coupon
export const editCoupon = async (req, res) => {
    try {
        const couponId = req.params.id;
        const {
            name,
            code,
            discountValue,
            minOrderAmount,
            maxDiscountAmount,
            startDate,
            endDate,
            usageLimit,
            description
        } = req.body;

        const cleanCode = code.trim().toUpperCase();

     
        const existingCoupon = await Coupon.findOne({
            _id: { $ne: couponId },
            code: cleanCode
        });

        if (existingCoupon) {
            req.session.error = 'Coupon code already exists';
            return res.redirect('/admin/coupons');
        }

        await Coupon.findByIdAndUpdate(couponId, {
            name: name.trim(),
            code: cleanCode,
            discountValue: parseFloat(discountValue),
            minOrderAmount: parseFloat(minOrderAmount) || 0,
            maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            usageLimit: usageLimit ? parseInt(usageLimit) : null,
            description: description.trim()
        });

        req.session.success = 'Coupon updated successfully';
        res.redirect('/admin/coupons');
    } catch (error) {
        console.error('Error in editCoupon:', error);
        req.session.error = 'Error updating coupon';
        res.redirect('/admin/coupons');
    }
};


export const toggleCouponStatus = async (req, res) => {
    try {
        const couponId = req.params.id;
        const coupon = await Coupon.findById(couponId);

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        coupon.isActive = !coupon.isActive;
        await coupon.save();

        res.json({
            success: true,
            isActive: coupon.isActive,
            message: coupon.isActive ? 'Coupon activated successfully' : 'Coupon deactivated successfully'
        });
    } catch (error) {
        console.error('Error in toggleCouponStatus:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating coupon status'
        });
    }
};

// Delete coupon
export const deleteCoupon = async (req, res) => {
    try {
        const couponId = req.params.id;
        const coupon = await Coupon.findByIdAndDelete(couponId);

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        res.json({
            success: true,
            message: 'Coupon deleted successfully'
        });
    } catch (error) {
        console.error('Error in deleteCoupon:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting coupon'
        });
    }
};
