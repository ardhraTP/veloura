import Product from '../../model/Product.js';
import Order from '../../model/Order.js';
import User from '../../model/User.js';
import Variant from '../../model/Variant.js';
import Review from '../../model/Review.js';
import PDFDocument from 'pdfkit';




export const getUserOrders = async (req, res) => {
    try {
        const userId = req.session.userId;
        const searchQuery = req.query.search ? req.query.search.trim() : '';

        const user = await User.findById(userId);

        let query = { user: userId };

        let orders = await Order.find(query)
            .populate('items.product')
            .populate('items.variant')
            .sort({ createdAt: -1 });

        if (searchQuery) {
            const lowerSearch = searchQuery.toLowerCase();
            orders = orders.filter(order => {
                const matchesOrderId = order.orderId.toLowerCase().includes(lowerSearch);

                const matchesOrderStatus = order.orderStatus.toLowerCase().includes(lowerSearch);

                const matchesItems = order.items.some(item => {
                    const productName = item.product?.productName?.toLowerCase() || '';

                    const brand = item.product?.brand?.toLowerCase() || '';
                    const color = item.variant?.color?.toLowerCase() || '';
                    const itemStatus = item.itemStatus?.toLocaleLowerCase() || '';

                    return productName.includes(lowerSearch) ||
                        brand.includes(lowerSearch) ||
                        color.includes(lowerSearch) ||
                        itemStatus.includes(lowerSearch);
                });

                return matchesOrderId || matchesOrderStatus || matchesItems;
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const totalOrders = orders.length;
        const totalPages = Math.ceil(totalOrders / limit);
        const startIndex = (page - 1) * limit;
        const paginatedOrders = orders.slice(startIndex, startIndex + limit);

        res.render('user/my-orders', {
            orders: paginatedOrders,
            user: user || { name: req.session.user?.name || 'User' },
            searchQuery: searchQuery,
            currentPage: page,
            totalPages: totalPages,
            activeTab: 'orders',
            isLoggedIn: true,
        });
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).render('error/500');
    }
};

//get specific order detail page
export const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.session.userId;

        const mongoose = (await import('mongoose')).default;

        let order = null;
        if (mongoose.Types.ObjectId.isValid(orderId)) {
            order = await Order.findById(orderId)
                .populate('items.product')
                .populate('items.variant');
        }

        if (!order) {
            order = await Order.findOne({ orderId: orderId, user: userId })
                .populate('items.product')
                .populate('items.variant');
        }

        if (!order || order.user.toString() !== userId.toString()) {
            return res.status(404).send('Order not found');
        }

        const user = await User.findById(userId);
        res.render('user/order-details', {
            order: order,
            user: user || { name: req.session.user?.name || 'User' },
            activeTab: 'orders',
            isLoggedIn: true
        });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.redirect('/profile/orders');
    }
};

export const cancelOrderProduct = async (req, res) => {
    try {

        const orderId = req.params.id;
        const { itemId, reason, comment } = req.body;
        const userId = req.session.userId;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.json({ success: false, message: 'Order not found' });
        }

        const item = order.items.find(i => i._id.toString() === itemId.toString());
        if (!item) {
            return res.json({ success: false, message: 'Item not found in order' });
        }

        if (item.itemStatus === 'Cancelled') {
            return res.json({ success: false, message: 'Item is already cancelled' });
        }

        if (item.itemStatus === 'Out for Delivery' || item.itemStatus === 'Delivered' || item.itemStatus === 'Returned') {
            return res.json({ success: false, message: 'Out for delivery, delivered, or returned items cannot be cancelled' });
        }


        item.itemStatus = 'Cancelled';
        item.cancellationReason = comment ? `${reason} - ${comment}` : reason;

        let refundAmount = 0;
        const isOnlineOrWallet = order.paymentMethod === 'Online' || 
                                 order.paymentMethod === 'Wallet' || 
                                 order.paymentMethod === 'Online Payment';

        if (isOnlineOrWallet) {
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

            refundAmount = Math.round(itemSubtotal + itemTaxShare + itemShippingShare - itemDiscountShare);

            const user = await User.findById(order.user);
            if (user && refundAmount > 0) {
                user.walletBalance = (user.walletBalance || 0) + refundAmount;
                user.walletHistory.push({
                    amount: refundAmount,
                    type: 'Credited',
                    description: `Refund for cancelled item in Order ${order.orderId}`,
                    date: new Date()
                });
                await user.save();
            }

            const allItemsReturnedOrCancelled = order.items.every(
                i => i.itemStatus === 'Returned' || i.itemStatus === 'Cancelled'
            );
            if (allItemsReturnedOrCancelled) {
                order.paymentStatus = 'Refunded';
            } else {
                order.paymentStatus = 'Partially Refunded';
            }
        }

        const allCancelled = order.items.every(i => i.itemStatus === 'Cancelled');
        if (allCancelled) {
            order.orderStatus = 'Cancelled';
            order.cancellationReason = 'All items cancelled';
        }

        await order.save();

        await Variant.findByIdAndUpdate(item.variant, {
            $inc: { quantity: item.quantity }
        });

        res.json({ success: true, message: 'Item cancelled successfully and stock/wallet updated!' });
    } catch (error) {
        console.error('Error in cancelOrderProduct controller:', error);
        res.json({ success: false, message: 'Server error while cancelling order item' });
    }
};

export const returnOrderProduct = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { itemId, reason } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.json({ success: false, message: 'Order not found' });
        }

        const item = order.items.find(i => i._id.toString() === itemId.toString());
        if (!item) {
            return res.json({ success: false, message: 'Item not found in order' });
        }

        if (item.itemStatus !== 'Delivered') {
            return res.json({ success: false, message: 'Only delivered items can be returned' });
        }

        item.itemStatus = 'Return Requested';
        item.returnReason = reason;

        await order.save();

        const allReturnedOrCancelled = order.items.every(i => i.itemStatus === 'Return Requested' || i.itemStatus === 'Returned' || i.itemStatus === 'Cancelled');
        if (allReturnedOrCancelled) {
            order.orderStatus = 'Return Requested';
            order.returnReason = 'Return requested for items';
            await order.save();
        }

        res.json({ success: true, message: 'Return request submitted successfully' });
    } catch (error) {
        console.error('Error in returnOrderProduct controller:', error);
        res.json({ success: false, message: 'Server error while submitting return request' });
    }
};

export const downloadInvoice = async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.session.userId;
      
        const order = await Order.findOne({ _id: orderId, user: userId })
            .populate('items.product')
            .populate('items.variant');
        if (!order) {
            return res.status(404).send('Order not found');
        }

       
        let invoiceSubtotal = 0;
        order.items.forEach(item => {
            if (item.itemStatus !== 'Cancelled' && item.itemStatus !== 'Returned') {
                invoiceSubtotal += item.price * item.quantity;
            }
        });
        const invoiceTax = Math.round(invoiceSubtotal * 0.05);
        const invoiceTotalAmount = Math.max(0, invoiceSubtotal + (order.shippingFee || 0) + invoiceTax - (order.discount || 0));
       
        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderId}.pdf`);
        doc.pipe(res);

        doc.fillColor('#5C1E28') 
            .font('Helvetica-Bold')
            .fontSize(26)
            .text('VELOURA', 50, 50);
        doc.fillColor('#666666')
            .font('Helvetica')
            .fontSize(9)
            .text('PREMIUM BEAUTY RITUALS', 50, 78);

      
        doc.fillColor('#2C2C2C')
            .font('Helvetica-Bold')
            .fontSize(20)
            .text('INVOICE', 400, 50, { align: 'right' });

        doc.moveTo(50, 95).lineTo(550, 95).strokeColor('#E6DED4').stroke();

      
        doc.fillColor('#5C1E28')
            .font('Helvetica-Bold')
            .fontSize(10)
            .text('BILLED TO:', 50, 115);
        doc.fillColor('#2C2C2C')
            .font('Helvetica-Bold')
            .fontSize(11)
            .text(order.deliveryAddress.fullName, 50, 130);
        doc.font('Helvetica')
            .fontSize(9)
            .text(order.deliveryAddress.address, 50, 145, { width: 220 })
            .text(`${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.pincode}`, 50, 175)
            .text(`Phone: +91 ${order.deliveryAddress.phone}`, 50, 190);

      
        doc.fillColor('#5C1E28')
            .font('Helvetica-Bold')
            .fontSize(10)
            .text('ORDER INFO:', 320, 115);
        doc.fillColor('#2C2C2C')
            .font('Helvetica')
            .fontSize(9)
            .text(`Invoice No: INV-${order.orderId}`, 320, 130)
            .text(`Order ID: ${order.orderId}`, 320, 145)
            .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 320, 160)
            .text(`Method: ${order.paymentMethod}`, 320, 175)
            .text(`Status: ${order.paymentStatus}`, 320, 190);
            
        doc.moveTo(50, 220).lineTo(550, 220).strokeColor('#E6DED4').stroke();
        // Table Header
        let y = 235;
        doc.fillColor('#5C1E28')
            .font('Helvetica-Bold')
            .fontSize(9);
        doc.text('Item Description', 50, y);
        doc.text('Color/Shade', 220, y);
        doc.text('Price', 320, y, { width: 60, align: 'right' });
        doc.text('Qty', 400, y, { width: 40, align: 'center' });
        doc.text('Total', 480, y, { width: 70, align: 'right' });
        // Table Divider
        doc.moveTo(50, 250).lineTo(550, 250).strokeColor('#E6DED4').stroke();
        y = 265;
        doc.fillColor('#2C2C2C')
            .font('Helvetica')
            .fontSize(9);
        order.items.forEach(item => {
            if (item.itemStatus === 'Cancelled' || item.itemStatus === 'Returned') {
                return;
            }
            const prodName = item.product?.productName || 'Unknown Product';
            const colorName = item.variant?.color || 'N/A';
            const priceVal = item.price;
            const quantity = item.quantity;
            const itemTotal = priceVal * quantity;
            doc.text(prodName, 50, y, { width: 160 });
            doc.text(colorName, 220, y, { width: 90 });
            doc.text(`Rs.${priceVal.toFixed(2)}`, 320, y, { width: 60, align: 'right' });
            doc.text(quantity.toString(), 400, y, { width: 40, align: 'center' });
            doc.text(`Rs.${itemTotal.toFixed(2)}`, 480, y, { width: 70, align: 'right' });
            y += 20;
        });
        doc.moveTo(50, y + 5).lineTo(550, y + 5).strokeColor('#E6DED4').stroke();
        y += 20;
        doc.font('Helvetica')
            .text('Subtotal:', 350, y, { width: 110, align: 'right' });
        doc.font('Helvetica-Bold')
            .text(`Rs.${invoiceSubtotal.toFixed(2)}`, 480, y, { width: 70, align: 'right' });
        y += 15;
        doc.font('Helvetica')
            .text('Taxes (5%):', 350, y, { width: 110, align: 'right' });
        doc.font('Helvetica-Bold')
            .text(`Rs.${invoiceTax.toFixed(2)}`, 480, y, { width: 70, align: 'right' });
        y += 15;
        doc.font('Helvetica')
            .text('Shipping:', 350, y, { width: 110, align: 'right' });
        doc.font('Helvetica-Bold')
            .text(order.shippingFee === 0 ? 'FREE' : `Rs.${order.shippingFee.toFixed(2)}`, 480, y, { width: 70, align: 'right' });
        if (order.discount > 0) {
            y += 15;
            doc.font('Helvetica')
                .text('Discount:', 350, y, { width: 110, align: 'right' });
            doc.font('Helvetica-Bold')
                .fillColor('#D92525')
                .text(`Rs.${order.discount.toFixed(2)}`, 480, y, { width: 70, align: 'right' });
        }
        y += 20;
        doc.moveTo(350, y - 5).lineTo(550, y - 5).strokeColor('#5C1E28').stroke();
        doc.fillColor('#5C1E28')
            .font('Helvetica-Bold')
            .fontSize(11)
            .text('Grand Total:', 350, y, { width: 110, align: 'right' });
        doc.text(`Rs.${invoiceTotalAmount.toFixed(2)}`, 480, y, { width: 70, align: 'right' });
        doc.fillColor('#999999')
            .font('Helvetica-Oblique')
            .fontSize(8)
            .text('Thank you for shopping with Veloura! For queries, contact support@veloura.com', 50, 720, { align: 'center', width: 500 });
        doc.end();
    } catch (error) {
        console.error('Error generating PDF invoice:', error);
        res.status(500).send('Error generating PDF invoice.');
    }
}


export const getPaymentSuccess = async (req,res)=>{
    try{
        const orderId = req.query.orderId;
        const userId = req.session.userId;

        if(!orderId){
            return res.redirect('/profile/orders');
        }

        const order = await Order.findOne({orderId: orderId,user:userId})
        .populate('items.product')
        .populate('items.variant');

        if(!order){
            return res.redirect('/profile/orders');
        }

        res.render('user/payment-success',{
            order:order,
            isLoggedIn:true
        });
    }catch(error){
        console.error('Error loading payment success page:',error);
        res.status(500).render('error/500');
    }
};


export const getPaymentFailed = async (req, res) => {
    try {
        const orderId = req.query.orderId;
        const userId = req.session.userId;

        if (orderId) {
            const order = await Order.findOne({ orderId: orderId, user: userId });
            if (order && order.paymentStatus !== 'Completed') {
                order.paymentStatus = 'Failed';
                if (order.orderStatus !== 'Cancelled') {
                    order.orderStatus = 'Pending';
                }
                await order.save();
            }
        }

        res.render('user/payment-failed', {
            orderId: orderId || null,
            isLoggedIn: true
        });
    } catch (error) {
        console.error('Error loading payment failed page:', error);
        res.status(500).render('error/500');
    }
};

export const retryPayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        const userId = req.session.userId;

        const order = await Order.findOne({ orderId: orderId, user: userId }).populate('items.product items.variant');

        if (!order) {
            return res.json({
                success: false,
                message: 'Order not found'
            });
        }

        if (order.paymentStatus === 'Completed') {
            return res.json({
                success: false,
                message: 'Payment already completed for this order'
            });
        }

        const Variant = (await import('../../model/Variant.js')).default;
        for (const item of order.items) {
            const variantId = item.variant ? (item.variant._id || item.variant) : null;
            const variant = variantId ? await Variant.findById(variantId) : null;
            const prodName = item.product ? item.product.productName : 'Item';

            if (!variant || variant.isDeleted || variant.status === 'INACTIVE') {
                return res.json({
                    success: false,
                    message: `${prodName} is no longer available.`
                });
            }

            if (variant.quantity < item.quantity) {
                return res.json({
                    success: false,
                    message: `${prodName} (${variant.color}): Only ${variant.quantity} item(s) available in stock. Cannot retry payment.`
                });
            }
        }

        const User = (await import('../../model/User.js')).default;
        const user = await User.findById(userId);

        const razorpayInstance = (await import('../../config/razorpay.js')).default;

        const razorpayOrder = await razorpayInstance.orders.create({
            amount: Math.round(order.totalAmount * 100),
            currency: 'INR',
            receipt: order.orderId,
            notes: {
                orderId: order.orderId,
                userId: userId.toString()
            }
        });

        order.razorpayOrderId = razorpayOrder.id;
        await order.save();

        res.json({
            success: true,
            razorpayOrderId: razorpayOrder.id,
            amount: order.totalAmount,
            keyId: process.env.RAZORPAY_KEY_ID,
            orderId: order.orderId,
            userName: user ? user.name : '',
            userEmail: user ? user.email : '',
            userPhone: user ? (user.mobile || '') : ''
        });

    } catch (error) {
        console.error('Error retrying payment:', error);
        res.json({
            success: false,
            message: 'Failed to retry payment. Please try again.'
        });
    }
};

export const submitProductReview = async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.session.userId;
        const { rating, title, comment } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.items.length === 0) {
            return res.status(400).json({ success: false, message: 'No items in order' });
        }

        const product = order.items[0].product;

        const newReview = new Review({
            user: userId,
            product: product,
            rating: parseInt(rating) || 5,
            title: title || '',
            comment: comment,
            status: 'Pending'
        });

        await newReview.save();

        res.redirect(`/profile/orders/${orderId}?success=review`);
    } catch (error) {
        console.error('Error submitting product review:', error);
        res.status(500).render('error/500');
    }
};