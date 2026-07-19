import { parse } from 'dotenv';
import Coupon from '../../model/Coupon.js';

// Get coupons management page
export const getCouponsPage = async (req, res) => {
    try {
        const search = req.query.search || '';
        const status = req.query.status || 'all';
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const filter = {};

        // Apply search filter (match name, code, or description)
        if (search) {
            filter.$or = [
                { code: { $regex: search, $options: 'i' } },
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Apply status filter
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

        res.render('admin/coupons', {
            coupons: coupons,
            currentPage: page,
            totalPages: totalPages,
            search: search,
            status: status,
            successMessage: req.query.success || null,
            errorMessage: req.query.error || null
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
            return res.redirect('/admin/coupons?error=Coupon Name is required.');
        }

        if(!code || !code.trim()){
            return res.redirect('/admin/coupons?error=Coupon Code is required.');
        }

        const cleanCode = code.trim().toUpperCase();

        const parsedDiscount = parseFloat(discountValue);
        if(isNaN(parsedDiscount) || parsedDiscount < 1 || parsedDiscount > 100 ){
            return res.redirect('/admin/coupons?error=Discount percentage must be between 1 and 100.');
        }

        const start =  new Date(startDate);
        const end = new Date(endDate);

        if(isNaN(start.getTime()) || isNaN(end.getTime())){
            return res.redirect('/admin/coupons?error=Please select valid dates.');
        }

        if(end < start){
            return res.redirect('/admin/coupons?error=Expiry date cannot be earlier than start date.');
        }

        const parsedMinOrder = parseFloat(minOrderAmount) || 0;
        if(parsedMinOrder < 0){
            return res.redirect('/admin/coupons?error=Minimum purchase amount cannot be negative.');
        }

        const parsedMaxDiscount  = maxDiscountAmount ? parseFloat(maxDiscountAmount) : null;
        if(parsedMaxDiscount !== null && parsedMaxDiscount < 0){
            return res.redirect('/admin/coupons?error=Maximum discount amount cannot be negative.');
        }

        const parsedUsageLimit = usageLimit ? parseInt(usageLimit) : null;
        if(parsedUsageLimit !== null && parsedUsageLimit <= 0){
            return res.redirect('/admin/coupons?error=Usage limit must be a positive number.');
        }

        const existingCoupon = await Coupon.findOne({
            code: cleanCode
        });

        if(existingCoupon){
            return res.redirect('/admin/coupons?error=Coupon code already exists. Please choose a unique code.');
        }



        const newCoupon = new Coupon({
            name: name.trim(),
            code: cleanCode,
            discountType: 'PERCENTAGE', // default to percentage discount
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

        res.redirect('/admin/coupons?success=Coupon added successfully');
    } catch (error) {
        console.error('Error in addCoupon:', error);
        res.redirect('/admin/coupons?error=Error adding coupon');
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

        // Check if another coupon with same code exists
        const existingCoupon = await Coupon.findOne({
            _id: { $ne: couponId },
            code: cleanCode
        });

        if (existingCoupon) {
            return res.redirect('/admin/coupons?error=Coupon code already exists');
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

        res.redirect('/admin/coupons?success=Coupon updated successfully');
    } catch (error) {
        console.error('Error in editCoupon:', error);
        res.redirect('/admin/coupons?error=Error updating coupon');
    }
};

// Toggle coupon active/inactive status
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
