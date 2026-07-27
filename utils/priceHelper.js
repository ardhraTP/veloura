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
        if (typeof category.categoryDiscount === 'number' && category.categoryDiscount >= 0) {
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
