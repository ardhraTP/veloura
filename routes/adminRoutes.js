import express from 'express';
import { getLogin, login, getDashboard, getUsers, toggleBlockUser, logout } from '../controller/Admin/adminController.js';

const router = express.Router();


router.get('/login', getLogin);
router.post('/login', login);

router.get('/dashboard', getDashboard);

router.get('/users', getUsers);
router.patch('/users/:id/toggle-block', toggleBlockUser);
router.get('/logout', logout);

export default router;
