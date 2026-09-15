const TelegramBot = require('node-telegram-bot-api');

// Thay chuỗi bên dưới bằng API Token bạn nhận từ BotFather
const token = '8693581582:AAExut166KoyBjvjfTUOFa5x0K78fgYhwys';

// Khởi tạo bot với cơ chế Polling (liên tục kiểm tra tin nhắn mới)
const bot = new TelegramBot(token, { polling: true });

console.log('Bot đang chạy...');

// 1. Xử lý lệnh /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'bạn';

  bot.sendMessage(chatId, `Xin chào ${firstName}! Tôi là Bot JavaScript của bạn.`, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🌐 Mở Website', url: 'https://google.com' },
          { text: '🔔 Nhấn thử', callback_data: 'btn_click' }
        ]
      ]
    }
  });
});

// 2. Xử lý khi người dùng nhấn vào nút "Nhấn thử"
bot.on('callback_query', (query) => {
  if (query.data === 'btn_click') {
    bot.answerCallbackQuery(query.id, { text: 'Bạn vừa nhấn nút!' });
    bot.sendMessage(query.message.chat.id, 'Cảm ơn bạn đã phản hồi!');
  }
});

// 3. Phản hồi các tin nhắn văn bản thông thường
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Bỏ qua nếu là lệnh bắt đầu bằng dấu /
  if (text && text.startsWith('/')) return;

  bot.sendMessage(chatId, `Bạn vừa nói: "${text}"`);
});
