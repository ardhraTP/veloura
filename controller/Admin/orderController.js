import { response } from 'express';
import Order from '../../model/Order.js';
import User from '../../model/User.js';
import Variant from '../../model/Variant.js';


export const getAdminOrdersPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const search = req.query.search ? req.query.search.trim() : '';
        const date = req.query.date || '';
        const payment = req.query.payment || 'all';
        const status = req.query.status || 'all';

        let query = {};
        if (status !== 'all') {
            query.orderStatus = status;
        }

        if (payment !== 'all') {
            query.paymentMethod = payment;
        }

        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0);

            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);

            query.createdAt = { $gte: startDate, $lte: endDate };
        }

        if (search) {
            const matchingUsers = await User.find({
                $or: [{ name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
                ]
            });

            const userIds = matchingUsers.map(u => u._id);

            query.$or = [
                { orderId: { $regex: search, $options: 'i' } },
                { user: { $in: userIds } },
                { 'deliveryAddress.fullName': { $regex: search, $options: 'i' } }
            ];
        }

        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await Order.find(query)
            .populate('user')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.render('admin/orders', {
            orders: orders,
            currentPage: page,
            totalPages: totalPages,
            searchQuery: search,
            currentStatus: status,
            currentPayment: payment,
            currentDate: date,
            selectedTab: 'orders'
        });
    } catch (error) {
        console.error('Error fetching admin orders list:', error);
        res.status(500).send('Internal Server Error');
    }
};

export const getAdminOrderDetail = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId)
            .populate('user')
            .populate('items.product')
            .populate('items.variant');

        if (!order) {
            return res.status(404).send('Order not found');
        }
        res.render('admin/order-details', {
            order: order,
            selectedTab: 'orders'
        });
    } catch (error) {
        console.error('Error fetching admin order deatils:', error);
        res.status(500).send('Internal Server Error');
    }
}


export const updateAdminOrderStatus = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status, cancellationReason } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.json({ sucess: false, message: 'Order not found' });
        }

        if (order.orderStatus === 'Cancelled' || order.orderStatus === 'Returned') {
            return res.json({ sucess: false, message: 'Cannot modify status of a closed order' });
        }

        if (status === 'Cancelled') {

            for (const item of order.items) {
                if (item.itemStatus !== 'Cancelled') {
                    await Variant.findByIdAndUpdate(item.variant, { $inc: { quantity: item.quantity } });
                    item.itemStatus = 'Cancelled';
                }
            }
            order.orderStatus = 'Cancelled';
            order.cancellationReason = cancellationReason || 'Cancelled by administrator';

            if (order.paymentMethod !== 'COD') {
                order.paymentStatus = 'Refunded';
            }
        } else if (status === 'Returned') {
            for (const item of order.items) {
                if (item.itemStatus !== 'Cancelled' && item.itemStatus !== 'Returned') {
                    await Variant.findByIdAndUpdate(item.variant, { $inc: { quantity: item.quantity } });
                    item.itemStatus = 'Returned';
                }
            }
            order.orderStatus = 'Returned';

            if (order.paymentMethod !== 'COD') {
                order.paymentStatus = 'Refunded';
            }
        } else {
            order.items.forEach(item => {
                if (item.itemStatus !== 'Cancelled' && item.itemStatus !== 'Returned') {
                    item.itemStatus = status;
                }
            });
            order.orderStatus = status;

            if (status === 'Delivered') {
                order.paymentStatus = 'Completed';
            }
        }

        await order.save();

        res.json({ success: true, message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.json({ success: false, message: 'Server error while updating order status' });
    }
};