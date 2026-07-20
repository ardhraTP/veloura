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


export const updateItemStatus = async (req,res)=>{
    try{
        const {orderId,itemId,status} = req.body;

        if(!orderId || !itemId || !status){
            return res.json({
                success:false,
                message:'Order ID, item ID,and status are required'
            });
        }

        const order = await Order.findOne({orderId:orderId});

        if(!order){
            return res.json({
                success:false,
                message:'Order not found'
            });
        }

        const item = order.items.find(i => i._id.toString() === itemId);
        
        if(!item){
            return res.json({
                success:false,
                message:'Item not found in order'
            });
        }

        item.itemStatus = status;
        await order.save();

        res.json({
            success:true,
            message:'Item status updated successfully',
            order:order
        });

    }catch(error){
        console.error('Error updating item status:',error);
        res.json({
            success:false,
            message:error.message || 'Failed to update item status'
        });
    }
};


//approve return and refund to wallet
// export const approveReturn = async (req,res)=>{
//     try{
//         const {orderId,itemId} = req.body;

//         if(!orderId || !itemId){
//             return res.json({
//                 success:false,
//                 message:'Order ID and item ID are required'
//             });
//         }

//         const order = await Order.findOne({orderId:orderId});

//         if(!order){
//             return res.json({
//                 success:false,
//                 message:'Order not found'
//             });
//         }

//         const item = order.items.find(i => i._id.toString() === itemId);

//         if(!item){
//             return res.json({
//                 success:false,
//                 message:'Item is not marked as returned'
//             });
//         }

//         const refundAmount = item.price * item.quantity;

//         const user = await User.findById(order.user);
//         user.walletBalance += refundAmount;
//         user.walletHistory.push({
//             amount: refundAmount,
//             type: 'Credited',
//             description: `Refund for returned item in order ${orderId}`,
//             date: new Date()
//         });

//         await user.save();

//         order.paymentStatus = 'Refunded';
//         await order.save();

//         res.json({
//             success:true,
//             message:`Return approved. ₹${refundAmount}  refunded to wallet`,
//             order:order,
//             refundAmount: refundAmount
//         });
//     }catch(error){
//         console.error('Error approving return:',error);
//         res.json({
//             success:false,
//             message:error.message || 'Failed to approve return'
//         });
//     }
// };


export const approveReturn = async (req,res)=>{
    try{
        const {orderId,itemId} = req.body;

        if(!orderId || !itemId){
            return res.json({
                success:false,
                message:'Order ID and Item ID are required.'
            });
        }

        const order = await Order.findOne({orderId:orderId});
        if(!order){
            return res.json({
                success:false,
                message:'Order not found.'
            });
        }

        const item = order.items.find(i => i._id.toString() === itemId);
        if(!item){
            return res.json({
                success:false,
                message:'Item not found in this order.'
            });
        }

        if(item.itemStatus === 'Returned'){
            return res.json({
                success:false,
                message:'This item has already been returned and refunded.'
            });
        }

        if(item.itemStatus !== 'Return Requested'){
            return res.json({
                success:false,
                message:'This item return request cannot be approved because it is not in "Return Requested" status.'
            });
        }

        const itemSubtotal = item.price * item.quantity;
        const totalDiscount = order.discount || 0;
        const totalTax = order.tax || 0;
        const totalShipping = order.shippingFee || 0;

        let itemDiscountShare = 0;
        let itemTaxShare = 0;
        let itemShippingShare = 0;

        if (order.subtotal > 0) {
            itemDiscountShare = (itemSubtotal / order.subtotal) * totalDiscount;
            itemTaxShare = (itemSubtotal / order.subtotal) * totalTax;
            itemShippingShare = (itemSubtotal / order.subtotal) * totalShipping;
        }

        const refundAmount = Math.round(itemSubtotal + itemTaxShare + itemShippingShare - itemDiscountShare);

        const variant = await Variant.findById(item.variant);
        if(variant){
            variant.quantity += item.quantity;
            await variant.save();
        }

        item.itemStatus = 'Returned';

        const user = await User.findById(order.user);
        if(!user){
            return res.json({
                success:false,
                message:'User associated with this order was not found.'
            });
        }

        user.walletBalance = (user.walletBalance || 0) + refundAmount;

        user.walletHistory.push({
            amount: refundAmount,
            type: 'Credited',
            description: `Refund for returned item (${item.product ? 'Cosmetic Item' : 'Product'}) in Order ${orderId}`,
            date: new Date()
        });
        await user.save();

        const allItemsReturnedOrCancelled = order.items.every(
            i => i.itemStatus === 'Returned' || i.itemStatus === 'Cancelled'
        );

        if(allItemsReturnedOrCancelled){
            order.orderStatus = 'Returned';
            order.paymentStatus = 'Refunded';
        }else{
            order.paymentStatus = 'Partially Refunded';
        }

        await order.save();

        return res.json({
            success:true,
            message:`Return approved!  ₹${refundAmount}  has been refunded to ${user.name}'s wallet.`,
            refundAmount: refundAmount
        });

    }catch(error){
        console.error('Error approving return request:',error);

        return res.json({
            success:false,
            message: error.message || 'Something went wrong while approving the return.'
        });
    }
};


export const rejectReturn = async (req, res) => {
    try {
        const { orderId, itemId, reason } = req.body;

        if (!orderId || !itemId || !reason) {
            return res.json({
                success: false,
                message: 'Order ID, Item ID, and rejection reason are required.'
            });
        }

        const order = await Order.findOne({ orderId: orderId });
        if (!order) {
            return res.json({
                success: false,
                message: 'Order not found.'
            });
        }

        const item = order.items.find(i => i._id.toString() === itemId);
        if (!item) {
            return res.json({
                success: false,
                message: 'Item not found in this order.'
            });
        }

        if (item.itemStatus !== 'Return Requested') {
            return res.json({
                success: false,
                message: 'This item return request cannot be rejected as it is not in Return Requested status.'
            });
        }

        item.itemStatus = 'Return Rejected';
        item.returnRejectionReason = reason;

        const allRejectedOrCancelled = order.items.every(
            i => i.itemStatus === 'Return Rejected' || i.itemStatus === 'Cancelled'
        );

        if (allRejectedOrCancelled) {
            order.orderStatus = 'Return Rejected';
        }

        await order.save();

        return res.json({
            success: true,
            message: 'Return request rejected successfully.'
        });

    } catch (error) {
        console.error('Error rejecting return request:', error);
        return res.json({
            success: false,
            message: error.message || 'Something went wrong while rejecting the return.'
        });
    }
};



export const getOrderStats = async (req,res)=>{
    try{
        const totalOrders = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({orderStatus:'Pending'});
        const processingOrders = await Order.countDocuments({orderStatus:'Processing'});
        const deliveredOrders = await Order.countDocuments({orderStatus:'Delivered'});
        const cancelledOrders = await Order.countDocuments({orderStatus:'Cancelled'});


        const revenueResult = await Order.aggregate([
            {$match:{paymentStatus: 'Completed'}},
            {$group:{_id:null,total:{$sum:'$totalAmount'}}}
        ]);

        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;


        res.json({
            success:true,
            stats:{
                totalOrders,
                pendingOrders,
                processingOrders,
                deliveredOrders,
                cancelledOrders,
                totalRevenue
            }
        });
    }catch(error){
        console.error('Error getting order stats:',error);
        res.json({
            success:false,
            message:'Failed to get order statistics'
        });
    }
};