import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/temp'); // Temporary storage before processing
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'variant-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (JPEG, PNG, WebP, AVIF) are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 
    }
});

const uploadAny = upload.any();

export const uploadVariantImages = (req, res, next) => {
    uploadAny(req, res, function (err) {
        if (err) {
            console.error('Multer file upload error:', err.message);
            if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
                return res.status(400).json({
                    success: false,
                    message: err.message || 'Only image files (JPEG, PNG, WebP, AVIF) are allowed!'
                });
            }
            req.session.error = err.message || 'Only image files (JPEG, PNG, WebP, AVIF) are allowed!';
            return res.redirect(req.get('referer') || '/admin/products/add');
        }
        next();
    });
};
