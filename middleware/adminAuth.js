import User from '../model/User.js';

export const isAdminAuthenticated = async (req, res, next) => {

    if (req.session && req.session.adminId) {
        try {
            const admin = await User.findById(req.session.adminId);

            if (!admin) {
                req.session.destroy();
                return res.redirect('/admin/login?error=account_deleted');
            }

            if (!admin.isAdmin) {
                req.session.destroy();
                return res.redirect('/admin/login?error=unauthorized');
            }

            if (admin.isBlocked) {
                req.session.destroy();
                return res.redirect('/admin/login?error=blocked');
            }

            return next();
        } catch (error) {
            console.error('Admin auth middleware error:', error);
            req.session.destroy();
            return res.redirect('/admin/login?error=session_error');
        }
    }   
    return res.redirect('/admin/login?session=expired');
};
 

export const isAdminGuest = (req, res, next) => {
    if (!req.session || !req.session.adminId) {
        return next();
    }
    return res.redirect('/admin/dashboard');
};
