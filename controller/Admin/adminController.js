import User from '../../model/User.js';
import bcrypt from 'bcryptjs';


// Render the admin login page

export const getLogin = (req, res) => {
    if (req.session.adminId) {
        return res.redirect('/admin/dashboard');
    }

    res.render('admin/login', {
        error: req.session.adminLoginError || null
    });

    req.session.adminLoginError = null;
};

//Handle admin login post request
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // console.log('=== ADMIN LOGIN ATTEMPT ===');
        console.log('Email:', email);

        const adminUser = await User.findOne({ email: email, isAdmin: true });

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
    if (!req.session.adminId) {
        return res.redirect('/admin/login');
    }

    res.render('admin/dashboard');
};


// Render admin products page

export const getProducts = (req, res) => {
    if (!req.session.adminId) {
        return res.redirect('/admin/login');
    }

    res.render('admin/products', { products: [] });
};


//Render admin users page with Pagination, Search & Filter

export const getUsers = async (req, res) => {
    try {
        if (!req.session.adminId) {
            return res.redirect('/admin/login');
        }

        let page = parseInt(req.query.page) || 1;
        let limit = 5;
        let query = { isAdmin: false };

        if (req.query.search) {
            query.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { email: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        if (req.query.status && req.query.status !== 'all') {
            query.isBlocked = req.query.status === 'blocked';
        }

        const totalUsers = await User.countDocuments(query);
        const totalPages = Math.ceil(totalUsers / limit);

        const users = await User.find(query)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

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


// Toggle user block status

export const toggleBlockUser = async (req, res) => {
    try {
        if (!req.session.adminId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const userId = req.params.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.isBlocked = !user.isBlocked;
        await user.save();

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


// Admin logout

export const logout = (req, res) => {
    req.session.adminId = null;
    res.redirect('/admin/login');
};
