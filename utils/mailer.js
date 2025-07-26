import nodemailer from "nodemailer";

export const sendMail = async (to, subject, text) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.MAILTRAP_SMTP_HOST,
            port: process.env.MAILTRAP_SMTP_PORT,
            secure: false, 
            auth: {
                user: process.env.MAILTRAP_SMTP_USER,
                pass: process.env.MAILTRAP_SMTP_PASS
            }
        });

        const info = await sendMail({
            from: `"AI Ticket Assistant" <${process.env.MAILTRAP_SMTP_USER}>`,
            to,
            subject,
            text
        });

        await transporter.sendMail(info);
        console.log('Email sent successfully', info.mesasageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;

    }
};
