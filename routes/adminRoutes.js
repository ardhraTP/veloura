import express from 'express';
import { isAdminAuthenticated, isAdminGuest } from '../middleware/adminAuth.js';
import { getLogin, login, getDashboard,getDashboardData, getUsers, toggleBlockUser, logout } from '../controller/Admin/adminController.js';
import Order from '../model/Order.js';
import { getAdminOrdersPage, getAdminOrderDetail, updateAdminOrderStatus,updateItemStatus,approveReturn,rejectReturn,getOrderStats } from '../controller/Admin/orderController.js';
import { getReviewsPage, approveReview, rejectReview } from '../controller/Admin/reviewController.js';

import {
    getAdminProductsPage,
    getAddProductPage,
    addProduct,
    getEditProductPage,
    updateProduct,
    updateProductDetails,
    toggleProductStatus,
    deleteProduct,
    addVariant,
    deleteVariant,
    addImageToVariant,
    removeImageFromVariant,
    updateVariantDetails,
    toggleVariantStatus
} from '../controller/Admin/productController.js';


import {
    getCategoriesPage,
    addCategory,
    editCategory,
    toggleListCategory,
    deleteCategory
} from '../controller/Admin/categoryController.js';

import {
    getCouponsPage,
    addCoupon,
    editCoupon,
    toggleCouponStatus,
    deleteCoupon
} from '../controller/Admin/couponController.js';


import { uploadVariantImages } from '../middleware/variantUpload.js';
import { isAuthenticated } from '../middleware/userAuth.js';

const router = express.Router();

router.get('/login', isAdminGuest, getLogin);
router.post('/login', isAdminGuest, login);

router.get('/dashboard', isAdminAuthenticated, getDashboard);
router.get('/api/dashboard-data',isAdminAuthenticated,getDashboardData);



router.get('/categories', isAdminAuthenticated, getCategoriesPage);
router.post('/categories/add', isAdminAuthenticated, addCategory);
router.post('/categories/:id/edit', isAdminAuthenticated, editCategory);
router.patch('/categories/:id/toggle-list', isAdminAuthenticated, toggleListCategory);
router.delete('/categories/:id/delete', isAdminAuthenticated, deleteCategory);

router.get('/coupons', isAdminAuthenticated, getCouponsPage);
router.post('/coupons/add', isAdminAuthenticated, addCoupon);
router.post('/coupons/edit/:id', isAdminAuthenticated, editCoupon);
router.patch('/coupons/toggle-status/:id', isAdminAuthenticated, toggleCouponStatus);
router.delete('/coupons/delete/:id', isAdminAuthenticated, deleteCoupon);

router.get('/sales-report', isAdminAuthenticated, async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('user')
            .populate('items.product')
            .sort({ createdAt: -1 });
        res.render('admin/sales-report', { orders: orders });
    } catch (error) {
        console.error('Error fetching orders for sales report:', error);
        res.status(500).render('error/500');
    }
});


router.get('/users', isAdminAuthenticated, getUsers);
router.patch('/users/:id/toggle-block', isAdminAuthenticated, toggleBlockUser);
router.get('/logout', isAdminAuthenticated, logout);

router.get('/products', isAdminAuthenticated, getAdminProductsPage);
router.get('/products/add', isAdminAuthenticated, getAddProductPage);
router.post('/products/add', isAdminAuthenticated, uploadVariantImages, addProduct);
router.get('/products/edit/:id', isAdminAuthenticated, getEditProductPage);
router.post('/products/edit/:id', isAdminAuthenticated, updateProduct);
router.post('/products/update-details/:id', isAdminAuthenticated, updateProductDetails);
router.put('/products/toggle-status/:id', isAdminAuthenticated, toggleProductStatus);
router.delete('/products/delete/:id', isAdminAuthenticated, deleteProduct);
router.post('/products/:id/add-variant', isAdminAuthenticated, uploadVariantImages, addVariant);
router.delete('/variants/delete/:id', isAdminAuthenticated, deleteVariant);
router.post('/variants/:id/add-image', isAdminAuthenticated, uploadVariantImages, addImageToVariant);
router.delete('/variants/:id/remove-image', isAdminAuthenticated, removeImageFromVariant);
router.post('/variants/update/:id', isAdminAuthenticated, updateVariantDetails);
router.put('/variants/toggle-status/:id', isAdminAuthenticated, toggleVariantStatus);

router.get('/orders', isAdminAuthenticated, getAdminOrdersPage);
router.get('/orders/:id', isAdminAuthenticated, getAdminOrderDetail);
router.post('/orders/:id/status', isAdminAuthenticated, updateAdminOrderStatus);
router.post('/orders/update-item-status',isAdminAuthenticated,updateItemStatus);
router.post('/orders/approve-return',isAdminAuthenticated,approveReturn);
router.post('/orders/reject-return',isAdminAuthenticated,rejectReturn);
router.get('/api/order-stats',isAdminAuthenticated,getOrderStats);

// Review m-anagement Routes
router.get('/reviews', isAdminAuthenticated, getReviewsPage);
router.post('/reviews/approve', isAdminAuthenticated, approveReview);
router.post('/reviews/reject', isAdminAuthenticated, rejectReview);

export default router;

