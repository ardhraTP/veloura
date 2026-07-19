export const calculateOfferPrice = (product, regularPrice) => {
    const now = new Date();
    let productDiscount = 0;
    let categoryDiscount = 0;


    if (product.offer && product.offer.isActive) {
        const hasNotExpired = !product.offer.expiryDate || new Date(product.offer.expiryDate) > now;
        if (hasNotExpired) {
            productDiscount = product.offer.discount || 0;
        }
    }

    const category = product.categoryId; 
    if (category) {
        const hasNotExpired = !category.categoryOfferExpiry || new Date(category.categoryOfferExpiry) > now;
        if (hasNotExpired && category.categoryDiscount > 0) {
            categoryDiscount = category.categoryDiscount;
        }
    }

    const activeDiscount = Math.max(productDiscount, categoryDiscount);

    let finalPrice = regularPrice;
    if (activeDiscount > 0) {
        const discountAmount = regularPrice * (activeDiscount / 100);
        finalPrice = Math.round(regularPrice - discountAmount);
    }

    return {
        finalPrice: finalPrice,
        discountPercentage: activeDiscount
    };
};
