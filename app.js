import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import passport from 'passport';
import connectDB from './config/database.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';


dotenv.config();


import './config/passport.js';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();


connectDB();


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});


app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        // maxAge: 24 * 60 * 60 * 1000 
    }
}));

app.use(passport.initialize());
app.use(passport.session());


app.use('/admin', adminRoutes);
app.use('/', userRoutes);


app.use('*', (req, res) => {
    res.status(404).render('error/404');
});

app.get('/test-cloudinary', async (req, res) => {
    try {
        const result = await cloudinary.api.ping();
        res.json({ success: true, result });
    } catch (err) {
        res.json({ success: false, error: err.message, http_code: err.http_code });
    }
});

app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).render('error/500');
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(` Server running on http://localhost:${PORT}`);
   
});

export default app;





