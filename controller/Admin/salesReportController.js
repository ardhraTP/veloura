import Order from '../../model/Order.js';

// Get sales report with pagination
export const getSalesReport = async (req, res) => {
    try {
        // Get page number from query, default is 1
        const page = parseInt(req.query.page) || 1;
        const limit = 5; // 5 items per page
        const skip = (page - 1) * limit;

        // Get filter parameters from query
        const period = req.query.period || 'all';
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        // Build date filter based on period
        let dateFilter = {};
        const now = new Date();

        if (period === 'daily') {
            // Today's orders
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            dateFilter = { createdAt: { $gte: todayStart } };
        } else if (period === 'weekly') {
            // Last 7 days
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateFilter = { createdAt: { $gte: oneWeekAgo } };
        } else if (period === 'yearly') {
            // Last 365 days
            const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            dateFilter = { createdAt: { $gte: oneYearAgo } };
        } else if (period === 'custom' && startDate && endDate) {
            // Custom date range
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter = { createdAt: { $gte: start, $lte: end } };
        }

        // Count total documents matching the filter
        const totalOrders = await Order.countDocuments(dateFilter);
        const totalPages = Math.ceil(totalOrders / limit);

        // Fetch paginated orders with filters
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

        // Build query params for pagination links
        let queryParams = '';
        if (period && period !== 'all') queryParams += `period=${period}&`;
        if (startDate) queryParams += `startDate=${startDate}&`;
        if (endDate) queryParams += `endDate=${endDate}&`;
        // Remove trailing '&' if exists
        if (queryParams.endsWith('&')) {
            queryParams = queryParams.slice(0, -1);
        }

        // Calculate page numbers to display (similar to orders page)
        const pages = [];
        const maxPagesToShow = 5;

        if (totalPages <= maxPagesToShow) {
            // Show all pages if total is small
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Show first page
            pages.push(1);

            // Calculate middle range
            let startPage = Math.max(2, page - 1);
            let endPage = Math.min(totalPages - 1, page + 1);

            // Add dots if needed at start
            if (startPage > 2) {
                pages.push('...');
            }

            // Add middle pages
            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }

            // Add dots if needed at end
            if (endPage < totalPages - 1) {
                pages.push('...');
            }

            // Show last page
            pages.push(totalPages);
        }

        // Render the sales report page with pagination data
        res.render('admin/sales-report', {
            orders: orders,
            currentPage: page,
            totalPages: totalPages,
            totalOrders: totalOrders,
            pages: pages,
            queryParams: queryParams,
            period: period || 'all',
            startDate: startDate || '',
            endDate: endDate || ''
        });

    } catch (error) {
        console.error('Error fetching sales report:', error);
        res.status(500).render('error/500');
    }
};
