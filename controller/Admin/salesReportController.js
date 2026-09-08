import Order from '../../model/Order.js';
import Product from '../../model/Product.js';

export const getSalesReport = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5; // 5 items per page
        const skip = (page - 1) * limit;

        const period = req.query.period || 'all';
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        let dateFilter = {};
        const now = new Date();

        if (period === 'daily') {

            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            dateFilter = { createdAt: { $gte: todayStart } };
        } else if (period === 'weekly') {

            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateFilter = { createdAt: { $gte: oneWeekAgo } };
        } else if (period === 'yearly') {

            const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            dateFilter = { createdAt: { $gte: oneYearAgo } };
        } else if (period === 'custom' && startDate && endDate) {

            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter = { createdAt: { $gte: start, $lte: end } };
        }

        const totalOrders = await Order.countDocuments(dateFilter);
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await Order.find(dateFilter)
            .populate('user', 'name email phone')
            .populate({
                path: 'items.product',
                populate: { path: 'categoryId' }
            })
            .populate('items.variant')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        

        let queryParams = '';
        if (period && period !== 'all') queryParams += `period=${period}&`;
        if (startDate) queryParams += `startDate=${startDate}&`;
        if (endDate) queryParams += `endDate=${endDate}&`;
        if (queryParams.endsWith('&')) {
            queryParams = queryParams.slice(0, -1);
        }

        const pages = [];
        const maxPagesToShow = 5;

        if (totalPages <= maxPagesToShow) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);

            let startPage = Math.max(2, page - 1);
            let endPage = Math.min(totalPages - 1, page + 1);

            if (startPage > 2) {
                pages.push('...');
            }

            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }

            if (endPage < totalPages - 1) {
                pages.push('...');
            }

            pages.push(totalPages);
        }

        res.render('admin/sales-report', {
            orders: orders,
            currentPage: page,
            totalPages: totalPages,
            totalOrders: totalOrders,
            pages: pages,
            queryParams: queryParams,
            period: period || 'all',
            startDate: startDate || '',
            endDate: endDate || '',
            amountCount: amountCount
        });

    } catch (error) {
        console.error('Error fetching sales report:', error);
        res.status(500).render('error/500');
    }
};
