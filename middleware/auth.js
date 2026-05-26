import { sendResponse } from '../utils/helpers.js';

export const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    return sendResponse(res, false, 'Please login first', null, 401);
};

export const isGuest = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return next();
    }
    return res.redirect('/home');
};
