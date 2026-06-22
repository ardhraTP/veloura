import * as wishlistService from '../../services/wishlistService.js';

//show wishlist page 

export const getWishlistPage = async (req, res) => {
    try {
        const userId = req.session.userId;

        const wishlist = await wishlistService.getUserWishlist(userId);

        res.render('user/wishlist', {
            wishlist: wishlist
        });
    } catch (error) {
        console.log('Error in getWishlistPage:', error);
        res.status(500).send('error/500');
    }
};

//add to wishlist
export const addToWishlist = async (req, res) => {
    try {
        const userId = req.session.userId;
        const productId = req.body.productId;

        //add to wishlist
        const wishlist = await wishlistService.addToWishlist(userId, productId);

        res.json({
            success: true,
            message: 'Added to wishlsit',
            wishlist: wishlist
        });
    } catch (error) {
        console.log('Error in addToWishlist:', error);
        res.json({
            success: false,
            message: error.message
        });
    }
};


//remove from  wishlist 
export const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.userId;
        const productId = req.params.productId;

        const wishlist = await wishlistService.removeFromWishlist(userId, productId);

        res.json({
            success: true,
            message: 'Removed from wishlist',
            wishlist: wishlist
        });
    } catch (error) {
        console.log('Error in removeFromWishlsit:', error);
        res.json({
            success: false,
            message: error.message,
        });
    }
};

// Get wishlist count for navbar
export const getWishlistCount = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.json({ count: 0 });
        }
        const wishlist = await wishlistService.getUserWishlist(req.session.userId);
        const count = wishlist && wishlist.products ? wishlist.products.length : 0;
        res.json({ count });
    } catch (error) {
        console.log('Error in getWishlistCount:', error);
        res.json({ count: 0 });
    }
};