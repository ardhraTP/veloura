import bcrypt from 'bcryptjs';
import {
    findAdminByEmail,
    findAdminById,
    buildUserQuery,
    getUsersWithPagination,
    toggleUserBlockStatus,
    findUserById
} from '../../services/adminService.js';


export const getLogin = (req, res) => {
    res.render('admin/login', {
        error: req.session.adminLoginError || null
    });

    req.session.adminLoginError = null;
};


export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const adminUser = await findAdminByEmail(email);

        if (adminUser) {
            const isMatch = await bcrypt.compare(password, adminUser.password);

            if (isMatch) {
                req.session.adminId = adminUser._id;
                return res.redirect('/admin/dashboard');
            }
        }

        req.session.adminLoginError = 'Invalid admin credentials';
        return res.redirect('/admin/login');

    } catch (error) {
        console.error('Admin login error:', error);
        req.session.adminLoginError = 'Something went wrong. Please try again.';
        res.redirect('/admin/login');
    }
};


// Admin dashboard
export const getDashboard = (req, res) => {
    res.render('admin/dashboard');
};




export const getUsers = async (req, res) => {
    try {
        let page = parseInt(req.query.page) || 1;
        let limit = 5;
        
     
        const query = buildUserQuery(req.query.search, req.query.status);

       
        const { users, totalPages } = await getUsersWithPagination(query, page, limit); 

        res.render('admin/users', {
            users,  
            currentPage: page,
            totalPages,
            searchQuery: req.query.search || '',
            currentStatus: req.query.status || 'all'
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Internal Server Error');
    }
};



export const toggleBlockUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await toggleUserBlockStatus(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            isBlocked: user.isBlocked,
            message: user.isBlocked ? 'User blocked successfully' : 'User unblocked successfully'
        });
    } catch (error) {
        console.error('Error toggling block status:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};




export const logout = (req, res) => {
    req.session.adminId = null;
    res.redirect('/admin/login');
};
