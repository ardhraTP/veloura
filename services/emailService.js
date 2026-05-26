import nodemailer from 'nodemailer';

// Create transporter with better error handling
const createTransporter = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        throw new Error('Email credentials not configured. Please set EMAIL_USER and EMAIL_PASSWORD in .env file');
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

export const sendOTP = async (email, otp, name) => {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Veloura - OTP Verification',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #5c1e28;">Hello ${name}!</h2>
                    <p>Your OTP for verification is:</p>
                    <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
                        <h1 style="color: #5c1e28; font-size: 32px; margin: 0;">${otp}</h1>
                    </div>
                    <p>This OTP will expire in 5 minutes.</p>
                    <p>If you didn't request this verification, please ignore this email.</p>
                    <p>Best regards,<br><strong>Veloura Team</strong></p>
                </div>
            `
        };
        
        const result = await transporter.sendMail(mailOptions);
        console.log('OTP email sent successfully:', result.messageId);
        return result;
    } catch (error) {
        console.error('Failed to send OTP email:', error);
        throw new Error('Failed to send verification email. Please try again.');
    }
};

export const sendResetPassword = async (email, token, name) => {
    try {
        const transporter = createTransporter();
        const resetLink = `${process.env.BASE_URL}/reset-password?token=${token}`;
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Veloura - Reset Password',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #5c1e28;">Hello ${name}!</h2>
                    <p>You requested to reset your password for your Veloura account.</p>
                    <p>Click the button below to reset your password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="background-color: #5c1e28; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
                    </div>
                    <p>Or copy and paste this link in your browser:</p>
                    <p style="word-break: break-all; color: #666;">${resetLink}</p>
                    <p>This link will expire in 15 minutes.</p>
                    <p>If you didn't request this password reset, please ignore this email.</p>
                    <p>Best regards,<br><strong>Veloura Team</strong></p>
                </div>
            `
        };
        
        const result = await transporter.sendMail(mailOptions);
        console.log('Reset password email sent successfully:', result.messageId);
        return result;
    } catch (error) {
        console.error('Failed to send reset password email:', error);
        throw new Error('Failed to send password reset email. Please try again.');
    }
};