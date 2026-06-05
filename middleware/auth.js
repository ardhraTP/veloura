import { sendResponse } from '../utils/helpers.js';
import User from '../model/User.js';

export const isAuthenticated = async (req, res, next) => {
 
    if (req.session && req.session.userId) {
        try {
           
            const user = await User.findById(req.session.userId);
            
            if (!user) {
                req.session.destroy();
                return res.redirect('/login?error=account_deleted');
            }
            
         
            if (user.isBlocked) {
                req.session.destroy();
                return res.redirect('/login?error=blocked');
            }
            
            
            return next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            req.session.destroy();
            return res.redirect('/login?error=session_error');
        }
    }
   

    return res.redirect('/login?session=expired');
};

export const isGuest = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return next();
    }
    return res.redirect('/home');
};

