export const calculateOfferPrice = (product, regularPrice, baseSalePrice = null) => {
    const now = new Date();
    let productDiscount = 0;
    let categoryDiscount = 0;

    // 1. Calculate Product Offer
    if (product) {
        if (typeof product.offer === 'number' && product.offer > 0) {
            productDiscount = product.offer;
        } else if (product.offer && typeof product.offer === 'object') {
            const disc = Number(product.offer.discount) || 0;
            const isActive = product.offer.isActive !== false && disc > 0;
            const hasNotExpired = !product.offer.expiryDate || new Date(product.offer.expiryDate) > now;
            if (isActive && hasNotExpired) {
                productDiscount = disc;
            }
        }
    }

    // 2. Calculate Category Offer
    const category = product ? (product.categoryId || product.category) : null;
    if (category && typeof category === 'object') {
        const hasNotExpired = !category.categoryOfferExpiry || new Date(category.categoryOfferExpiry) > now;
        let catDiscountVal = 0;
        
        if (typeof category.categoryDiscount === 'number' && category.categoryDiscount > 0) {
            catDiscountVal = category.categoryDiscount;
        }
        
        if (category.offer) {
            let parsed = 0;
            if (typeof category.offer === 'number') {
                parsed = category.offer;
            } else if (typeof category.offer === 'string' && category.offer.trim() !== '') {
                parsed = parseFloat(category.offer.replace(/[^0-9.]/g, '')) || 0;
            } else if (typeof category.offer === 'object' && category.offer.discount) {
                parsed = Number(category.offer.discount) || 0;
            }
            if (parsed > catDiscountVal) {
                catDiscountVal = parsed;
            }
        }

        if (hasNotExpired && catDiscountVal > 0) {
            categoryDiscount = catDiscountVal;
        }
    }

    // 3. Always apply the greatest offer (Product or Category)
    const activeDiscount = Math.max(productDiscount, categoryDiscount);

    let offerType = null;
    if (activeDiscount > 0) {
        if (categoryDiscount > productDiscount) {
            offerType = 'Category Offer';
        } else if (productDiscount > 0) {
            offerType = 'Product Offer';
        }
    }

    // 4. Calculate final discounted price based on regularPrice and activeDiscount
    let finalPrice = regularPrice;
    if (activeDiscount > 0 && regularPrice > 0) {
        const discountAmount = regularPrice * (activeDiscount / 100);
        finalPrice = Math.round(regularPrice - discountAmount);
    } else if (baseSalePrice !== null && baseSalePrice !== undefined && baseSalePrice > 0) {
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

    const remainingActiveItems = order.items.filter(i => {
        const idStr = i._id ? i._id.toString() : String(i);
        return idStr !== itemToRefundIdStr && i.itemStatus !== 'Cancelled' && i.itemStatus !== 'Returned';
    });

    const isFinalItem = remainingActiveItems.length === 0;

    let alreadyRefundedTax = 0;
    order.items.forEach(i => {
        const idStr = i._id ? i._id.toString() : String(i);
        if (idStr !== itemToRefundIdStr && (i.itemStatus === 'Cancelled' || i.itemStatus === 'Returned')) {
            if (typeof i.refundTax === 'number' && i.refundTax > 0) {
                alreadyRefundedTax += i.refundTax;
            } else {
                const prevSubtotal = i.price * i.quantity;
                if (order.subtotal > 0) {
                    alreadyRefundedTax += Math.round((prevSubtotal / order.subtotal) * totalTax);
                }
            }
        }
    });

    let itemTaxShare = 0;
    if (isFinalItem) {
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
