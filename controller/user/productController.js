import * as productService from '../../services/productService.js';
import { getUserWishlist } from '../../services/wishlistService.js';
import { calculateOfferPrice } from '../../utils/priceHelper.js';
import Review from '../../model/Review.js';




export const getProductsPage = async (req,res)=>{
    try{
        const search = req.query.search || '';
        const category = req.query.category || '';
        const brand = req.query.brand || '';
        const sort = req.query.sort || 'newest';
        const page = parseInt(req.query.page) || 1;


        
        const result = await productService.getProducts({
            search:search,
            category:category,
            brand:brand,
            sort:sort,
            page:page
        });

        const allCategories = await productService.getAllCategories();
        const allBrands = await productService.getAllBrands();

        let wishlistProductIds = [];
        if(req.session && req.session.userId){
            try{
                const wishlist = await 
                getUserWishlist(req.session.userId);
                if(wishlist && wishlist.products){
                    wishlistProductIds= wishlist.products.map(p => p._id.toString());  
                }

            }catch(err){
                console.error('Error fetching wishlist in getProductsPage:',err);
            }
        }

        res.render('user/products',{
            products:result.products,
            currentPage:result.currentPage,
            totalPages:result.totalPages,
            search:search,
            selectedCategory:category,
            selectedBrand:brand,
            selectedSort:sort,
            categories:allCategories,
            brands:allBrands,
            isLoggedIn: !!(req.session && req.session.userId),
            wishlistProductIds:wishlistProductIds
        });
    }catch(error){
        console.log('Error in getProductsPage:',error);
        res.status(500).render('error/500');
    }
};

export const getProductDetail = async (req,res)=>{
    try{
        const productId = req.params.id;

        const product = await productService.getProductById(productId);

        if (!product) {
            return res.redirect('/products');
        }

        
        if (product.variants && product.variants.length > 0) {
            product.variants = product.variants.map(variant => {
                const variantObj = typeof variant.toObject === 'function' ? variant.toObject() : { ...variant };
                const { finalPrice, discountPercentage } = calculateOfferPrice(product, variantObj.regularPrice, variantObj.salePrice);
                variantObj.salePrice = finalPrice;
                variantObj.discountPercentage = discountPercentage;
                variantObj.activeOfferDiscount = discountPercentage;
                return variantObj;
            });
        }


        let isInWishlist = false;
        if(req.session && req.session.userId){
            try{
                const wishlist = await getUserWishlist(req.session.userId);
                if(wishlist){
                    if (wishlist.items && wishlist.items.length > 0) {
                        isInWishlist = wishlist.items.some(item => item.product && item.product._id.toString() === productId);
                    } else if (wishlist.products) {
                        isInWishlist = wishlist.products.some(p => p._id.toString() === productId);
                    }
                }
            }catch(err){
                console.error('Error checking wishlist in getProductDetail:',err);
            }
        }

        const reviews = await Review.find({ product: productId, status: 'Approved' })
            .populate('user')
            .sort({ createdAt: -1 });

        res.render('user/product-detail',{
            product:product,
            isLoggedIn: !!(req.session && req.session.userId),
            isInWishlist : isInWishlist,
            reviews: reviews
        });
    }catch(error){
        console.log('Error in getProductDetail:',error);
        res.status(500).send('error/500');
    }
};