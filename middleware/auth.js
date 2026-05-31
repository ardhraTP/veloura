import { sendResponse } from '../utils/helpers.js';

export const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    // AJAX / API requests → return JSON so the client can handle it
    const isAjax = req.xhr ||
        req.headers['x-requested-with'] === 'XMLHttpRequest' ||
        (req.headers.accept && req.headers.accept.includes('application/json') && !req.headers.accept.includes('text/html'));

    if (isAjax) {
        return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
    }
    // Regular page request → redirect to login with a flag for toast
    return res.redirect('/login?session=expired');
};

export const isGuest = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return next();
    }
    return res.redirect('/home');
};
