const nodemailer = require('nodemailer');
require('dotenv').config();

const CLIENT_URL = process.env.CLIENT_URL || 'https://btl-khaipha.vercel.app';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS
  }
});

module.exports.sendEmail = async (receiveEmail, subject, html) => {
  const mailOptions = {
    from: `"Blog Platform" <${process.env.EMAIL}>`,
    to: receiveEmail,
    subject: subject,
    html: html
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${receiveEmail}`);
    return true;
  } catch (error) {
    console.error(`❌ Email failed:`, error.message);
    return false;
  }
};

module.exports.sendVerificationEmail = async (email, token) => {
  const verifyUrl = `${CLIENT_URL}/verify-email?token=${token}`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f23; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">📝 Blog Platform</h1>
        <p style="color: rgba(255,255,255,0.85); margin-top: 8px;">Xác thực tài khoản email</p>
      </div>
      <div style="padding: 30px; color: #e2e8f0;">
        <p>Xin chào,</p>
        <p>Cảm ơn bạn đã đăng ký tài khoản. Vui lòng nhấn nút bên dưới để xác thực email:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Xác thực Email</a>
        </div>
        <p style="color: #94a3b8; font-size: 14px;">Link sẽ hết hạn sau 24 giờ.</p>
        <p style="color: #94a3b8; font-size: 14px;">Nếu bạn không đăng ký, vui lòng bỏ qua email này.</p>
      </div>
    </div>
  `;
  return await module.exports.sendEmail(email, 'Xác thực tài khoản - Blog Platform', html);
};

module.exports.sendResetPasswordEmail = async (email, token) => {
  const resetUrl = `${CLIENT_URL}/reset-password?token=${token}`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f23; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #ef4444, #f97316); padding: 40px 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🔑 Đặt lại mật khẩu</h1>
        <p style="color: rgba(255,255,255,0.85); margin-top: 8px;">Blog Platform</p>
      </div>
      <div style="padding: 30px; color: #e2e8f0;">
        <p>Xin chào,</p>
        <p>Bạn đã yêu cầu đặt lại mật khẩu. Nhấn nút bên dưới để tiếp tục:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: linear-gradient(135deg, #ef4444, #f97316); color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Đặt lại mật khẩu</a>
        </div>
        <p style="color: #94a3b8; font-size: 14px;">Link sẽ hết hạn sau 1 giờ.</p>
        <p style="color: #94a3b8; font-size: 14px;">Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
      </div>
    </div>
  `;
  return await module.exports.sendEmail(email, 'Đặt lại mật khẩu - Blog Platform', html);
};
