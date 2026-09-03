import Wishlist from '../model/Wishlist.js';
import { checkProductAvailability } from './productService.js';
import Variant from '../model/Variant.js';
import { calculateOfferPrice } from '../utils/priceHelper.js';

export const getUserWishlist = async (userId) => {
    try {
        let wishlist = await Wishlist.findOne({ user: userId })
            .populate({ path: 'items.product', populate: { path: 'categoryId' } })
            .populate('items.variant')
            .populate({ path: 'products', populate: { path: 'categoryId' } });

        if (!wishlist) {
            wishlist = new Wishlist({
                user: userId,
                items: [],
                products: []
            });
            await wishlist.save();
        }

        if ((!wishlist.items || wishlist.items.length === 0) && wishlist.products && wishlist.products.length > 0) {
            for (const prod of wishlist.products) {
                if (prod) {
                    const prodId = prod._id || prod;
                    const firstVar = await Variant.findOne({
                        productId: prodId,
                        isDeleted: false,
                        status: { $ne: 'INACTIVE' }
                    });
                    wishlist.items.push({
                        product: prodId,
                        variant: firstVar ? firstVar._id : null
                    });
                }
            }
            await wishlist.save();
            
            wishlist = await Wishlist.findOne({ user: userId })
                .populate({ path: 'items.product', populate: { path: 'categoryId' } })
                .populate('items.variant')
                .populate({ path: 'products', populate: { path: 'categoryId' } });
        }

        const formattedItems = await Promise.all((wishlist.items || []).map(async (item) => {
            if (!item || !item.product) return null;
            
            const productObj = item.product.toObject ? item.product.toObject() : item.product;
            let variantObj = item.variant ? (item.variant.toObject ? item.variant.toObject() : item.variant) : null;

            if (!variantObj && productObj._id) {
                const firstVar = await Variant.findOne({
                    productId: productObj._id,
                    isDeleted: false,
                    status: { $ne: 'INACTIVE' }
                });
                if (firstVar) {
                    variantObj = firstVar.toObject ? firstVar.toObject() : firstVar;
                }
            }

            if (variantObj) {
                const { finalPrice, discountPercentage } = calculateOfferPrice(productObj, variantObj.regularPrice, variantObj.salePrice);
                variantObj.salePrice = finalPrice;
                variantObj.discountPercentage = discountPercentage;
            }

            return {
                _id: item._id,
                product: productObj,
                variant: variantObj
            };
        }));

        const cleanItems = formattedItems.filter(Boolean);

        return {
            _id: wishlist._id,
            user: wishlist.user,
            items: cleanItems,
            products: wishlist.products || []
        };
    } catch (error) {
        console.log('Error getting wishlist:', error);
        throw error;
    }
};

export const addToWishlist = async (userId, productId, variantId = null) => {
    try {
        const check = await checkProductAvailability(productId, 1);
        if (!check.available) {
            throw new Error(check.message);
        }

        let wishlist = await Wishlist.findOne({ user: userId });
        if (!wishlist) {
            wishlist = new Wishlist({
                user: userId,
                items: [],
                products: []
            });
            await wishlist.save();
        }

        if (!variantId) {
            const firstVar = await Variant.findOne({
                productId: productId,
                isDeleted: false,
                status: { $ne: 'INACTIVE' }
            });
            if (firstVar) {
                variantId = firstVar._id.toString();
            }
        }

        const alreadyInItems = wishlist.items && wishlist.items.some(item => {
            const pId = item.product ? item.product.toString() : '';
            const vId = item.variant ? item.variant.toString() : '';
            return pId === productId.toString() && (!variantId || vId === variantId.toString());
        });

        if (alreadyInItems) {
            throw new Error('This shade is already in your wishlist');
        }

        wishlist.items.push({
            product: productId,
            variant: variantId
        });

        if (!wishlist.products.some(p => p.toString() === productId.toString())) {
            wishlist.products.push(productId);
        }

        await wishlist.save();
        return await getUserWishlist(userId);
    } catch (error) {
        console.log('Error adding to wishlist:', error);
        throw error;
    }
};

export const removeFromWishlist = async (userId, productId, variantId = null) => {
    try {
        let wishlist = await Wishlist.findOne({ user: userId });
        if (wishlist) {
            if (variantId) {
                wishlist.items = (wishlist.items || []).filter(item => {
                    const pMatch = item.product && item.product.toString() === productId.toString();
                    const vMatch = item.variant && item.variant.toString() === variantId.toString();
                    return !(pMatch && vMatch);
                });
            } else {
                wishlist.items = (wishlist.items || []).filter(item => {
                    return item.product && item.product.toString() !== productId.toString();
                });
            }

            const hasOtherShades = wishlist.items.some(item => item.product && item.product.toString() === productId.toString());
            if (!hasOtherShades) {
                wishlist.products = (wishlist.products || []).filter(
                    p => p.toString() !== productId.toString()
                );
            }

            await wishlist.save();
        }

        return await getUserWishlist(userId);
    } catch (error) {
        console.log('Error removing from wishlist:', error);
        throw error;
    }
};

export const isInWishlist = async (userId, productId, variantId = null) => {
    try {
        const wishlist = await Wishlist.findOne({ user: userId });
        if (!wishlist) return false;

        if (wishlist.items && wishlist.items.length > 0) {
            return wishlist.items.some(item => {
                const pMatch = item.product && item.product.toString() === productId.toString();
                if (!variantId) return pMatch;
                const vMatch = item.variant && item.variant.toString() === variantId.toString();
                return pMatch && vMatch;
            });
        }

        return wishlist.products.some(p => p.toString() === productId.toString());
    } catch (error) {
        console.log('Error checking wishlist:', error);
        return false;
    }
};