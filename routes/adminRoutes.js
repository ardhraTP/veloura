import express from 'express';
import { isAdminAuthenticated, isAdminGuest } from '../middleware/adminAuth.js';
import { getLogin, login, getDashboard, getUsers, toggleBlockUser, logout } from '../controller/Admin/adminController.js';

import {
    getAdminProductsPage,
    getAddProductPage,
    addProduct,
    getEditProductPage,
    updateProduct,
    toggleProductStatus,
    deleteProduct,
    addVariant,
    deleteVariant,
    addImageToVariant,
    removeImageFromVariant
} from '../controller/Admin/productController.js';


import{
    getCategoriesPage,
    addCategory,
    editCategory,
    toggleListCategory,
    deleteCategory
} from '../controller/Admin/categoryController.js';

// Import product upload middleware
import { uploadVariantImages } from '../middleware/variantUpload.js';

const router = express.Router();

router.get('/login', isAdminGuest, getLogin);
router.post('/login', isAdminGuest, login);

router.get('/dashboard', isAdminAuthenticated, getDashboard);
// router.get('/categories', isAdminAuthenticated, (req, res) => {

//     res.render('admin/categories', {
//         categories: [],
//         successMessage: null,
//         errorMessage: null
//     });
// });
// router.get('/test-categories', isAdminAuthenticated, (req, res) => {
//     res.send('Categories route is working! Your session admin: ' + req.session.adminId);
// });

router.get('/categories',isAdminAuthenticated,getCategoriesPage);
router.post('/categories/add',isAdminAuthenticated,addCategory);
router.post('/categories/:id/edit',isAdminAuthenticated,editCategory);
router.patch('/categories/:id/toggle-list',isAdminAuthenticated,toggleListCategory);
router.delete('/categories/:id/delete',isAdminAuthenticated,deleteCategory);


router.get('/users', isAdminAuthenticated, getUsers);
router.patch('/users/:id/toggle-block', isAdminAuthenticated, toggleBlockUser);
router.get('/logout', isAdminAuthenticated, logout);

router.get('/products', isAdminAuthenticated, getAdminProductsPage);
router.get('/products/add', isAdminAuthenticated, getAddProductPage);
router.post('/products/add', isAdminAuthenticated, uploadVariantImages, addProduct);
router.get('/products/edit/:id', isAdminAuthenticated, getEditProductPage);
router.post('/products/edit/:id', isAdminAuthenticated, updateProduct);
router.put('/products/toggle-status/:id', isAdminAuthenticated, toggleProductStatus);
router.delete('/products/delete/:id', isAdminAuthenticated, deleteProduct);
router.post('/products/:id/add-variant', isAdminAuthenticated, uploadVariantImages, addVariant);
router.delete('/variants/delete/:id', isAdminAuthenticated, deleteVariant);
router.post('/variants/:id/add-image', isAdminAuthenticated, uploadVariantImages, addImageToVariant);
router.delete('/variants/:id/remove-image', isAdminAuthenticated, removeImageFromVariant);

export default router;

