import * as cartService from '../../services/cartService.js';


export const getCartPage = async (req, res) => {
    try {
        const userId = req.session.userId;
        
       
        const cart = await cartService.getUserCart(userId);
        
        
        res.render('user/cart', {
            cart: cart
        });
        
    } catch (error) {
        console.error('Error in getCartPage:', error);
        res.status(500).render('error/500');
    }
};


export const addToCart = async (req, res) => {
    try {
        const userId = req.session.userId;
        const productId = req.body.productId;
        const quantity = parseInt(req.body.quantity) || 1;
        
        // add to cart
        const cart = await cartService.addProductToCart(userId, productId, quantity);
        
    
        res.json({
            success: true,
            message: 'Product added to cart',
            cart: cart
        });
        
    } catch (error) {
        console.error('Error in addToCart:', error);
        res.json({
            success: false,
            message: error.message
        });
    }
};

//update quantity in cart
export const updateQuantity = async (req,res)=>{
    try{
        const userId = req.session.useraId;
        const productId = req.body.productId;
        const quantity = parseInt(req.body.quantity);

        const cart = await cartService.updateCartQuantity(userId,productId,quantity);

        res.json({
            success:true,
            message:'Quantity updated',
            cart:cart
        });
    }catch(error){
        console.log('Error in updateQuantity:',error);
        res.json({
            success:false,
            message:error.message
        });
    }
};

//remove item from cart
export const removeItem = async(req,res)=>{
    try{
        const userId = req.session.userId;
        const productId = req.params.productId;

        const cart = await cartService.removeFromCart(userId,productId);
        res.json({
            success:true,
            message:'Item removed from cart',
            cart:cart
        });
    }catch(error){
        console.log('Error in removeItem:',error);
        res.json({
            success:false,
            message:error.message
        });
    }
};