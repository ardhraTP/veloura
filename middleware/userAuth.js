import User from '../model/User.js';


export const isAuthenticated = async (req, res, next) => {

    if (req.session && req.session.userId) {
        try {
            const user = await User.findById(req.session.userId);

            if (!user) {
                delete req.session.userId;
                req.session.errorType = 'account_deleted';
                return res.redirect('/login');
            }

            if (user.isBlocked) {
                delete req.session.userId;
                req.session.errorType = 'blocked';
                return res.redirect('/login');
            }

            return next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            delete req.session.userId;
            req.session.errorType = 'session_error';
            return res.redirect('/login');
        }
    }


    req.session.sessionStatus = 'expired';
    return res.redirect('/login');
};


export const isGuest = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return next();
    }
    return res.redirect('/home');
};
