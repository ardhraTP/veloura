import nodemailer from 'nodemailer';


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

// Send user contact message to ardhraardhra407@gmail.com
export const sendContactMessage = async ({ name, email, phone, message }) => {
    try {
        const transporter = createTransporter();
        const destinationEmail = 'ardhraardhra407@gmail.com';
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: destinationEmail,
            replyTo: email,
            subject: `Veloura Customer Inquiry from ${name}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e8e4df; border-radius: 12px; background-color: #faf6f0;">
                    <h2 style="color: #5c1e28; margin-top: 0;">New Contact Form Message</h2>
                    <p style="font-size: 14px; color: #2c2c2c;"><strong>Name:</strong> ${name}</p>
                    <p style="font-size: 14px; color: #2c2c2c;"><strong>Email:</strong> ${email}</p>
                    <p style="font-size: 14px; color: #2c2c2c;"><strong>Phone:</strong> ${phone || 'N/A'}</p>
                    <hr style="border: none; border-top: 1px solid #e6ded4; margin: 20px 0;">
                    <p style="font-size: 14px; color: #2c2c2c;"><strong>Message:</strong></p>
                    <div style="background-color: #ffffff; padding: 18px; border-radius: 8px; border: 1px solid #e6ded4; color: #333333; line-height: 1.6;">
                        ${message.replace(/\n/g, '<br>')}
                    </div>
                    <p style="font-size: 12px; color: #888888; margin-top: 25px;">Sent from Veloura Website Contact Us Page</p>
                </div>
            `
        };
        
        const result = await transporter.sendMail(mailOptions);
        console.log('Contact message email sent successfully:', result.messageId);
        return result;
    } catch (error) {
        console.error('Failed to send contact message email:', error);
        throw error;
    }
};