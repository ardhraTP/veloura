import Order from '../model/Order.js';
import Cart from '../model/Cart.js';
import Variant from '../model/Variant.js';
import User from '../model/User.js';


//generate unique orderId
export const generateOrderId = ()=>{
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3,'0');
    return `ORD${timestamp}${random}`;
};

export const createOrder = async (userId,orderData)=>{
    try{
        const orderId = generateOrderId();

        const order = new Order({
            user:userId,
            orderId:orderId,
            deliveryAddress:orderData.deliveryAddress,
            items: orderData.items,
            subtotal: orderData.subtotal,
            shippingFee: orderData.shippingFee || 0,
            discount: orderData.discount || 0,
            tax: orderData.tax || 0,
            totalAmount: orderData.totalAmount,
            paymentMethod: orderData.paymentMethod,
            paymentStatus: orderData.paymentMethod === 'COD' ? 'Pending' :'Pending',
            orderStatus: 'Pending',
            coupon: orderData.coupon || null
        });

        await order.save();
        return order;
    }catch(error){
        console.error('Error creating order:',error);
        throw error;
    }
};

export const getUserOrders = async (userId)=>{
    try{
        const orders = await Order.find({user:userId})
        .populate('items.product')
        .populate('items.variant')
        .sort({createdAt: -1});
        return orders;
    }catch(error){
        console.error('Error getting user orders:',error);
        throw error;
    }
};

export const getOrderById = async (orderId,userId)=>{
    try{
        const order = await Order.findOne({orderId: orderId, user:userId})
        .populate('items.product')
        .populate('items.variant')
        return order;
    }catch(error){
        console.error('Error getting order:',error);
        throw error;
    }
};


export const cancelOrder = async (orderId,userId,reason)=>{
    try{
        const order = await Order.findOne({orderId:orderId,user:userId});

        if(!order){
            throw new Error('Order not found');
        }

        if(order.orderStatus === 'Delivered' || order.orderStatus === 'Cancelled'){
            throw new Error('Order cannot be cancelled');
        }

        order.orderStatus = 'Cancelled';
        order.cancellationReason = reason;

        order.items.forEach(item=>{
            item.itemStatus = 'Cancelled';
            item.cancellationReason = reason;
        });

        const isPaid = order.paymentStatus === 'Completed' || order.paymentStatus === 'Partially Refunded' || order.paymentStatus === 'Refunded';
        const canRestoreStock = isPaid || order.paymentMethod === 'COD' || order.paymentMethod === 'Wallet';

        if (canRestoreStock) {
            for (const item of order.items) {
                await Variant.findByIdAndUpdate(
                    item.variant,
                    { $inc: { quantity: item.quantity } }
                );
            }
        }

        // refund to wallet if order was paid using online or wallet payment method and payment was completed
        const isPaidPayment = order.paymentMethod === 'Online' || 
                             order.paymentMethod === 'Wallet' || 
                             order.paymentMethod === 'Online Payment';

        if (isPaidPayment && order.paymentStatus === 'Completed') {
            const refundAmount = order.totalAmount;

            const user = await User.findById(userId);
            if (user) {
                user.walletBalance = (user.walletBalance || 0) + refundAmount;
                user.walletHistory.push({
                    amount: refundAmount,
                    type: 'Credited',
                    description: `Refund for cancelled order ${orderId}`,
                    orderId: order.orderId || orderId,
                    date: new Date()
                });
                await user.save();
            }
            order.paymentStatus = 'Refunded';
        }
        await order.save();
        return order;
    }catch(error){
        console.error('Error cancelling order:',error);
        throw error;
    }
};


//return order
export const returnOrder = async(orderId,userId,reason)=>{
    try{
        const order = await Order.findOne({orderId:orderId,user:userId});

        if(!order){
            throw new Error('Order not found');
        }

        if(order.orderStatus !== 'Delivered'){
            throw new Error('Only delivered orders can be returned');
        }

        order.orderStatus = 'Returned';
        order.returnReason = reason;

        order.items.forEach(item=>{
            item.itemStatus = 'Returned';
            item.returnReason = reason;
        });

        await order.save();
        return order;
    }catch(error){
        console.error('Error returning order:',error);
        throw error;
    }
};


export const decreaseStock = async(items)=>{
    try{
        for(const item of items){
            await Variant.findByIdAndUpdate(
                item.variant,
                {$inc:{quantity: -item.quantity}}
            );
        }
    }catch(error){
        console.error('Error decreasing stock:',error);
        throw error;
    }
};

export const clearUserCart = async (userId)=>{
    try{
        await Cart.findOneAndUpdate(
            {user: userId},
            {items: [],totalAmount:0}
        );
    }catch(error){
        console.error('Error clearing cart:',error);
        throw error;
    }
};

//admin

export const getAllOrdersAdmin = async (filters = {})=>{
    try{
        let query = {};

        if(filters.status){
            query.orderStatus = filters.status;
        }

        if(filters.paymentStatus){
            query.paymentStatus = filters.paymentStatus;
        }

        if(filters.search){
            const safeSearch = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$or =[
                {orderId:{$regex: safeSearch,$options: 'i'}}
            ];
        }

        const orders = await Order.find(query)
        .populate('user','name email phone')
        .populate('items.product')
        .populate('items.variant')
        .sort({createdAt: -1});

        return orders;
    }catch(error){
        console.error('Error getting all orders:',error);
        throw error;
    }
};


export const updateOrderStatus = async (orderId,newStatus)=>{
    try{
        const order = await Order.findOne({orderId:orderId});

        if(!order){
            throw new Error('Order not found');
        }

        order.orderStatus = newStatus;

        order.items.forEach(item =>{
            if(item.itemStatus !== 'Cancelled' && item.itemStatus !== 'Returned'){
                item.itemStatus = newStatus;
            }
        });

        await order.save();
        return order;
    }catch(error){
        console.error('Error updating order status:',error);
        throw error;
    }
};


export const updateItemStatus = async (orderId,itemId,newStatus)=>{
    try{
        const order = await Order.findOne({orderId:orderId});

        if(!order){
            throw new Error('Order not found');
        }

        const item = order.items.find(i=>i._id.toString() === itemId);

        if(!item){
            throw new Error('Item not found in order');
        }

        item.itemStatus = newStatus;
        await order.save();

        return order;
    }catch(error){
        console.error('Error updating item status:',error);
        throw error;
    }
};


export const approveReturn = async (orderId,itemId)=>{
    try{
        const order = await Order.findOne({orderId:orderId});

        if(!order){
            throw new Error('Order not found');
        }

        const item = order.items.find(i => i._id.toString() === itemId);

        if(!item){
            throw new Error('Item not found');
        }

        if(item.itemStatus !== 'Returned'){
            throw new Error('Item is not marked as returned');
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

        const user = await User.findById(order.user);
        if (user) {
            user.walletBalance = (user.walletBalance || 0) + refundAmount;
            user.walletHistory.push({
                amount: refundAmount,
                type: 'Credited',
                description: `Refund for returned item in order ${orderId}`,
                orderId: order.orderId || orderId,
                date: new Date()
            });

            await user.save();
        }

        const allItemsReturnedOrCancelled = order.items.every(
            i => i.itemStatus === 'Returned' || i.itemStatus === 'Cancelled'
        );
        const hasReturnedItems = order.items.some(i => i.itemStatus === 'Returned');

        if (allItemsReturnedOrCancelled && hasReturnedItems) {
            order.orderStatus = 'Returned';
            order.paymentStatus = 'Refunded';
        } else if (hasReturnedItems) {
            order.orderStatus = 'Partially Returned';
            order.paymentStatus = 'Partially Refunded';
        }

        await order.save();

        return {order,refundAmount};
    }catch(error){
        console.error('Error approving return:',error);
        throw error;
    }
};


export const getOrderStats = async () =>{
    try{
        const totalOrders = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({orderStatus: 'Pending'});
        const processingOrders = await Order.countDocuments({orderStatus:'Processing'});
        const deliveredOrders = await Order.countDocuments({orderStatus:'Delivered'});
        const cancelledOrders = await Order.countDocuments({orderStatus:'Cancelled'});


        const revenueResult = await Order.aggregate([
            {$match:{paymentStatus:'Completed'}},
            {$group:{_id: null,total:{$sum: '$totalAmount'}}}
        ]);

        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

        return{
            totalOrders,
            pendingOrders,
            processingOrders,
            deliveredOrders,
            cancelledOrders,
            totalRevenue
        };
    }catch(error){
        console.error('Error getting order stats:',error);
        throw error;
    }
};