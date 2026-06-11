import express from 'express';
import { isAdminAuthenticated, isAdminGuest } from '../middleware/adminAuth.js';
import { getLogin, login, getDashboard, getUsers, toggleBlockUser, logout } from '../controller/Admin/adminController.js';

const router = express.Router();

router.get('/login', isAdminGuest, getLogin);
router.post('/login', isAdminGuest, login);

router.get('/dashboard', isAdminAuthenticated, getDashboard);
router.get('/users', isAdminAuthenticated, getUsers);
router.patch('/users/:id/toggle-block', isAdminAuthenticated, toggleBlockUser);
router.get('/logout', isAdminAuthenticated, logout);

export default router;
