export const calculateOfferPrice = (product, regularPrice, baseSalePrice = null) => {
    const now = new Date();
    let productDiscount = 0;
    let categoryDiscount = 0;

    // Check if there is an active product offer
    if (product && product.offer && product.offer.isActive) {
        const hasNotExpired = !product.offer.expiryDate || new Date(product.offer.expiryDate) > now;
        if (hasNotExpired) {
            productDiscount = Number(product.offer.discount) || 0;
        }
    }

    // Check if there is an active category offer
    const category = product ? product.categoryId : null;
    if (category && typeof category === 'object') {
        const hasNotExpired = !category.categoryOfferExpiry || new Date(category.categoryOfferExpiry) > now;
        let catDiscountVal = 0;
        if (typeof category.categoryDiscount === 'number' && category.categoryDiscount > 0) {
            catDiscountVal = category.categoryDiscount;
        } else if (category.offer && String(category.offer).trim() !== '') {
            catDiscountVal = parseFloat(String(category.offer).replace(/[^0-9.]/g, '')) || 0;
        }
        if (hasNotExpired && catDiscountVal > 0) {
            categoryDiscount = catDiscountVal;
        }
    }

    let activeDiscount = 0;
    let offerType = null;

    // Offer Selection Rules:
    // 1. If both offers exist and one is larger, pick the larger offer.
    // 2. If both offers exist and are equal (different types), give both offers to the user!
    // 3. If only one offer exists, apply that offer.
    if (productDiscount > 0 && categoryDiscount > 0) {
        if (productDiscount > categoryDiscount) {
            activeDiscount = productDiscount;
            offerType = 'Product Offer';
        } else if (categoryDiscount > productDiscount) {
            activeDiscount = categoryDiscount;
            offerType = 'Category Offer';
        } else {
            // Both offers are active, different types, and equal! Take both offers for the user.
            activeDiscount = Math.min(100, productDiscount + categoryDiscount);
            offerType = 'Product & Category Offer';
        }
    } else if (productDiscount > 0) {
        activeDiscount = productDiscount;
        offerType = 'Product Offer';
    } else if (categoryDiscount > 0) {
        activeDiscount = categoryDiscount;
        offerType = 'Category Offer';
    }

    let finalPrice = regularPrice;
    if (activeDiscount > 0) {
        const discountAmount = regularPrice * (activeDiscount / 100);
        finalPrice = Math.round(regularPrice - discountAmount);
    } else if (baseSalePrice !== null && baseSalePrice !== undefined) {
        finalPrice = baseSalePrice;
    }

    return {
        finalPrice: finalPrice,
        discountPercentage: activeDiscount,
        offerType: offerType,
        productDiscount: productDiscount,
        categoryDiscount: categoryDiscount
    };
};

/**
 * Helper function to calculate item refund amount and tax share.
 * Tracks tax already refunded for previous items in an order, so that the final
 * cancelled/returned item gets the exact remaining tax, preventing 1-rupee rounding errors.
 */
export const calculateItemRefund = (order, itemToRefund) => {
    const itemSubtotal = itemToRefund.price * itemToRefund.quantity;
    const totalDiscount = order.discount || 0;
    const totalTax = order.tax || 0;
    const totalShipping = order.shippingFee || 0;

    let itemDiscountShare = 0;
    let itemShippingShare = 0;

    if (order.subtotal > 0) {
        itemDiscountShare = (itemSubtotal / order.subtotal) * totalDiscount;
        itemShippingShare = (itemSubtotal / order.subtotal) * totalShipping;
    }

    const itemToRefundIdStr = itemToRefund._id ? itemToRefund._id.toString() : String(itemToRefund);

    // Check if there are any other active items remaining in this order
    const remainingActiveItems = order.items.filter(i => {
        const idStr = i._id ? i._id.toString() : String(i);
        return idStr !== itemToRefundIdStr && i.itemStatus !== 'Cancelled' && i.itemStatus !== 'Returned';
    });

    const isFinalItem = remainingActiveItems.length === 0;

    // Calculate tax already refunded for previously cancelled or returned items
    let alreadyRefundedTax = 0;
    order.items.forEach(i => {
        const idStr = i._id ? i._id.toString() : String(i);
        if (idStr !== itemToRefundIdStr && (i.itemStatus === 'Cancelled' || i.itemStatus === 'Returned')) {
            if (typeof i.refundTax === 'number' && i.refundTax > 0) {
                alreadyRefundedTax += i.refundTax;
            } else {
                // Fallback for older order items: calculate standard rounded tax share
                const prevSubtotal = i.price * i.quantity;
                if (order.subtotal > 0) {
                    alreadyRefundedTax += Math.round((prevSubtotal / order.subtotal) * totalTax);
                }
            }
        }
    });

    let itemTaxShare = 0;
    if (isFinalItem) {
        // Assign the exact remaining tax to the final item
        itemTaxShare = Math.max(0, totalTax - alreadyRefundedTax);
    } else {
        if (order.subtotal > 0) {
            itemTaxShare = Math.round((itemSubtotal / order.subtotal) * totalTax);
        }
    }

    const refundAmount = Math.round(itemSubtotal + itemTaxShare + itemShippingShare - itemDiscountShare);

    return {
        refundAmount: Math.max(0, refundAmount),
        itemTaxShare: itemTaxShare
    };
};
