import Review from '../../model/Review.js';
import User from '../../model/User.js';
import Product from '../../model/Product.js';

// Get reviews page
export const getReviewsPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const searchQuery = req.query.search ? req.query.search.trim() : '';
        const dateFilter = req.query.date || '';

        // Build main query
        let query = {};

        // Date Filter
        if (dateFilter) {
            const startOfDay = new Date(dateFilter);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(dateFilter);
            endOfDay.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: startOfDay, $lte: endOfDay };
        }

        // Perform text search filtering on user name, product name or comment if search query is provided
        let matchingUserIds = [];
        let matchingProductIds = [];

        if (searchQuery) {
            // Find users matching search query
            const users = await User.find({
                name: { $regex: searchQuery, $options: 'i' }
            }).select('_id');
            matchingUserIds = users.map(u => u._id);

            // Find products matching search query
            const products = await Product.find({
                productName: { $regex: searchQuery, $options: 'i' }
            }).select('_id');
            matchingProductIds = products.map(p => p._id);

            // Combine into query OR
            query.$or = [
                { comment: { $regex: searchQuery, $options: 'i' } },
                { title: { $regex: searchQuery, $options: 'i' } },
                { user: { $in: matchingUserIds } },
                { product: { $in: matchingProductIds } }
            ];
        }

        // Fetch paginated reviews
        const reviews = await Review.find(query)
            .populate('user')
            .populate('product')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalReviews = await Review.countDocuments(query);
        const totalPages = Math.ceil(totalReviews / limit);

        // Fetch Metrics
        const pendingCount = await Review.countDocuments({ status: 'Pending' });
        const totalApproved = await Review.countDocuments({ status: 'Approved' });

        // Rejected Today
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        const rejectedToday = await Review.countDocuments({
            status: 'Rejected',
            updatedAt: { $gte: startOfToday, $lte: endOfToday }
        });

        // Average Rating of Approved Reviews
        const ratingStats = await Review.aggregate([
            { $match: { status: 'Approved' } },
            { $group: { _id: null, avgRating: { $avg: '$rating' } } }
        ]);
        const averageRating = ratingStats.length > 0 ? ratingStats[0].avgRating.toFixed(1) : '0.0';

        res.render('admin/reviews', {
            reviews,
            currentPage: page,
            totalPages,
            searchQuery,
            currentDate: dateFilter,
            pendingCount,
            totalApproved,
            rejectedToday,
            averageRating,
            selectedTab: 'reviews'
        });

    } catch (error) {
        console.error('Error fetching admin reviews:', error);
        res.status(500).render('error/500');
    }
};

// Approve review
export const approveReview = async (req, res) => {
    try {
        const { reviewId } = req.body;
        const review = await Review.findById(reviewId);
        if (!review) {
            return res.json({ success: false, message: 'Review not found' });
        }

        review.status = 'Approved';
        await review.save();

        res.json({ success: true, message: 'Review approved successfully' });
    } catch (error) {
        console.error('Error approving review:', error);
        res.json({ success: false, message: 'Server error while approving review' });
    }
};

// Reject review
export const rejectReview = async (req, res) => {
    try {
        const { reviewId } = req.body;
        const review = await Review.findById(reviewId);
        if (!review) {
            return res.json({ success: false, message: 'Review not found' });
        }

        review.status = 'Rejected';
        await review.save();

        res.json({ success: true, message: 'Review rejected successfully' });
    } catch (error) {
        console.error('Error rejecting review:', error);
        res.json({ success: false, message: 'Server error while rejecting review' });
    }
};
