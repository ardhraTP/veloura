import bcrypt from 'bcryptjs';
import {
    findAdminByEmail,
    findAdminById,
    buildUserQuery,
    getUsersWithPagination,
    toggleUserBlockStatus,
    findUserById
} from '../../services/adminService.js';
import Order from '../../model/Order.js';
import User from '../../model/User.js';


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
export const getDashboard = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ isAdmin: false });
        const totalOrders = await Order.countDocuments();
        
        const totalSalesResult = await Order.aggregate([
            { $match: { orderStatus: { $nin: ['Cancelled', 'Returned'] } } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);
        const totalSales = totalSalesResult[0]?.total || 0;

        const recentOrders = await Order.find()
            .populate('user')
            .sort({ createdAt: -1 })
            .limit(5);

        res.render('admin/dashboard', {
            stats: {
                totalUsers,
                totalOrders,
                totalSales
            },
            recentOrders,
            selectedTab: 'dashboard'
        });
    } catch (error) {
        console.error('Error rendering admin dashboard:', error);
        res.status(500).send('Internal Server Error');
    }
};


export const getDashboardData = async (req, res) => {
    try {
        const { period } = req.query;
        const now = new Date();
        let startDate;
        let groupFormat;

        if (period === 'weekly') {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            groupFormat = "%Y-%m-%d";
        } else if (period === 'monthly') {
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            groupFormat = "%Y-%m-%d";
        } else {
            startDate = new Date(now.getFullYear(), 0, 1);
            groupFormat = "%Y-%m";
        }

        // 1. Chart Sales Data
        const chartData = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate },
                    orderStatus: { $nin: ['Cancelled', 'Returned'] }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
                    totalSales: { $sum: "$totalAmount" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 2. Top 10 Best Selling Products
        const topProducts = await Order.aggregate([
            { 
                $match: { 
                    createdAt: { $gte: startDate },
                    orderStatus: { $nin: ['Cancelled', 'Returned'] } 
                } 
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.product",
                    totalQty: { $sum: "$items.quantity" },
                    revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
                }
            },
            { $sort: { totalQty: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" }
        ]);

        // 3. Top 10 Best Selling Categories
        const topCategories = await Order.aggregate([
            { 
                $match: { 
                    createdAt: { $gte: startDate },
                    orderStatus: { $nin: ['Cancelled', 'Returned'] } 
                } 
            },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    localField: "items.product",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            {
                $group: {
                    _id: "$product.categoryId",
                    totalQty: { $sum: "$items.quantity" }
                }
            },
            { $sort: { totalQty: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },
            { $unwind: "$categoryDetails" }
        ]);

        // 4. Top 10 Best Selling Brands
        const topBrands = await Order.aggregate([
            { 
                $match: { 
                    createdAt: { $gte: startDate },
                    orderStatus: { $nin: ['Cancelled', 'Returned'] } 
                } 
            },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    localField: "items.product",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            {
                $group: {
                    _id: "$product.brand",
                    totalQty: { $sum: "$items.quantity" }
                }
            },
            { $sort: { totalQty: -1 } },
            { $limit: 10 }
        ]);

        return res.json({
            success: true,
            chartLabels: chartData.map(item => item._id),
            chartValues: chartData.map(item => item.totalSales),
            topProducts: topProducts.map(item => ({
                name: item.productDetails.productName,
                qty: item.totalQty,
                revenue: item.revenue
            })),
            topCategories: topCategories.map(item => ({
                name: item.categoryDetails.name,
                qty: item.totalQty
            })),
            topBrands: topBrands.map(item => ({
                name: item._id,
                qty: item.totalQty
            }))
        });
    } catch (error) {
        console.error('Error fetching dashboard statistics:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
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
