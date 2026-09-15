const TelegramBot = require('node-telegram-bot-api');
const nodemailer = require('nodemailer');
const axios = require('axios');

// 1. Cấu hình Telegram Bot Token
const botToken = '8693581582:AAExut166KoyBjvjfTUOFa5x0K78fgYhwys'; // Thay bằng Token từ BotFather
const bot = new TelegramBot(botToken, { polling: true });

// 2. Cấu hình Gmail SMTP (Dùng cho gửi/gửi lại mã xác minh)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'email_cua_ban@gmail.com', // Email của bạn
    pass: 'abcd efgh ijkl mnop'      // Mật khẩu ứng dụng (App Password 16 ký tự)
  }
});

// Bộ nhớ tạm lưu mã xác minh và email của người dùng (In-memory storage)
const userSessions = {};

console.log('Bot đang chạy đầy đủ các tính năng...');

// ==========================================
// 1. Lệnh /open [link] - Mở đường dẫn
// ==========================================
bot.onText(/\/open (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  let url = match[1].trim();

  // Tự động thêm https:// nếu thiếu
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  bot.sendMessage(chatId, `🔗 Bấm vào liên kết bên dưới để mở:`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🌐 Mở liên kết', url: url }]
      ]
    }
  });
});

// ==========================================
// 2. Lệnh /key64e [khoa] - Mã hóa Key sang Base64
// ==========================================
bot.onText(/\/key64e (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const rawKey = match[1].trim();

  const encodedKey = Buffer.from(rawKey, 'utf-8').toString('base64');
  bot.sendMessage(chatId, `🔑 **Key Mã Hóa Base64:**\n\`${encodedKey}\``, { parse_mode: 'Markdown' });
});

// ==========================================
// 3. Lệnh /email [dia_chi_email] - Gửi mã xác minh
// ==========================================
bot.onText(/\/email (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const email = match[1].trim();

  if (!email.includes('@')) {
    return bot.sendMessage(chatId, '❌ Email không hợp lệ! Cú pháp: `/email example@gmail.com`', { parse_mode: 'Markdown' });
  }

  // Tạo mã xác minh 6 chữ số ngẫu nhiên
  const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
  userSessions[chatId] = { email, code: verifyCode };

  await sendVerifyEmail(chatId, email, verifyCode);
});

// ==========================================
// 4. Lệnh /re - Gửi lại mã xác minh (Resend)
// ==========================================
bot.onText(/\/re/, async (msg) => {
  const chatId = msg.chat.id;
  const session = userSessions[chatId];

  if (!session || !session.email) {
    return bot.sendMessage(chatId, '❌ Bạn chưa nhập email. Hãy dùng lệnh `/email [dia_chi_email]` trước.', { parse_mode: 'Markdown' });
  }

  // Tạo mã mới và gửi lại
  const newCode = Math.floor(100000 + Math.random() * 900000).toString();
  session.code = newCode;

  await sendVerifyEmail(chatId, session.email, newCode, true);
});

// ==========================================
// 5. Lệnh /vem [ma_code] - Xác nhận mã
// ==========================================
bot.onText(/\/vem (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const inputCode = match[1].trim();
  const session = userSessions[chatId];

  if (!session || !session.code) {
    return bot.sendMessage(chatId, '❌ Không tìm thấy yêu cầu xác minh nào. Hãy dùng lệnh `/email` trước.');
  }

  if (inputCode === session.code) {
    bot.sendMessage(chatId, '✅ **Xác minh thành công!** Email của bạn đã được duyệt.', { parse_mode: 'Markdown' });
    delete userSessions[chatId]; // Xóa session sau khi xác minh xong
  } else {
    bot.sendMessage(chatId, '❌ Mã xác minh không chính xác. Vui lòng kiểm tra lại!');
  }
});

// ==========================================
// 6. Lệnh /hx3 - Gọi API Web Admin User
// ==========================================
bot.onText(/\/hx3/, async (msg) => {
  const chatId = msg.chat.id;
  const targetUrl = 'https://example.com/api/admin/users'; // Thay URL API Admin của bạn vào đây

  bot.sendMessage(chatId, '⏳ Đang gọi tới Admin Web...');

  try {
    const response = await axios.get(targetUrl, {
      headers: { 'User-Agent': 'TelegramBot/1.0' },
      timeout: 5000
    });

    const dataText = typeof response.data === 'object' 
      ? JSON.stringify(response.data, null, 2) 
      : response.data.toString();

    // Cắt ngắn nếu phản hồi quá dài (Telegram giới hạn 4096 ký tự)
    const safeText = dataText.length > 3000 ? dataText.substring(0, 3000) + '\n...' : dataText;

    bot.sendMessage(chatId, `📡 **Kết quả trả về từ Web Admin:**\n\`\`\`json\n${safeText}\n\`\`\``, { parse_mode: 'Markdown' });
  } catch (error) {
    bot.sendMessage(chatId, `❌ **Gọi Web thất bại!**\nLỗi: ${error.message}`);
  }
});

// Hàm hỗ trợ gửi Email
async function sendVerifyEmail(chatId, email, code, isResend = false) {
  const mailOptions = {
    from: '"Bot Verification" <email_cua_ban@gmail.com>',
    to: email,
    subject: isResend ? '[Gửi lại] Mã xác minh của bạn' : 'Mã xác minh của bạn',
    html: `
      <h3>Mã xác minh Telegram Bot</h3>
      <p>Mã của bạn là: <b style="font-size: 20px; color: #007bff;">${code}</b></p>
      <p>Nhập lệnh <code>/vem ${code}</code> trên Telegram để hoàn tất.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    const prefix = isResend ? '🔄 Đã gửi lại' : '📧 Đã gửi';
    bot.sendMessage(chatId, `${prefix} mã xác minh tới **${email}**. Vui lòng kiểm tra hộp thư và dùng lệnh \`/vem [ma_code]\` để xác minh.`, { parse_mode: 'Markdown' });
  } catch (error) {
    bot.sendMessage(chatId, `❌ Lỗi gửi email: ${error.message}`);
  }
}
