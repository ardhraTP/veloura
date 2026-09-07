import User from '../model/User.js';

export const isAdminAuthenticated = async (req, res, next) => {

    if (req.session && req.session.adminId) {
        try {
            const admin = await User.findById(req.session.adminId);

            if (!admin) {
                delete req.session.adminId;
                req.session.errorType = 'account_deleted';
                return res.redirect('/admin/login');
            }

            if (!admin.isAdmin) {
                delete req.session.adminId;
                req.session.errorType = 'unauthorized';
                return res.redirect('/admin/login');
            }

            if (admin.isBlocked) {
                delete req.session.adminId;
                req.session.errorType = 'blocked';
                return res.redirect('/admin/login');
            }

          return next();
        } catch (error) {
            console.error('Admin auth middleware error:', error);
            delete req.session.adminId;
            req.session.errorType = 'session_error';
            return res.redirect('/admin/login');
        }
    }   

    req.session.sessionStatus = 'expired';
    return res.redirect('/admin/login');
}; 


export const isAdminGuest = (req, res, next) => {
    if (!req.session || !req.session.adminId) {
        return next();
    }
    return res.redirect('/admin/dashboard');
};
