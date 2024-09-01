import TelegramBot from "node-telegram-bot-api";
import * as dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const BOT_KEY = process.env.BOT_KEY;
const DIMOVSKI_ID = process.env.DIMOVSKI_ID;

// Файл для хранения одобренных пользователей
const APPROVED_USERS_FILE = "approved_users.json";

if (!fs.existsSync(APPROVED_USERS_FILE)) {
  fs.writeFileSync(APPROVED_USERS_FILE, JSON.stringify([]));
}

let APPROVED_USERS = JSON.parse(fs.readFileSync(APPROVED_USERS_FILE, "utf8"));

const bot = new TelegramBot(BOT_KEY, { polling: true });

const new_users = [];

// Основная клавиатура с кнопками
const mainMenuKeyboard = {
  reply_markup: {
    keyboard: [
      [
        { text: "Новые пользователи" },
        { text: "Удалить пользователей" },
        { text: "Список пользователей" },
      ],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  },
};

// Обработка команды /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const user_id = msg.from.id.toString();
  const user_nickname = msg.from.username || "пользователь";
  const user_first_name = msg.from.first_name;

  console.log(msg.from);
  const userExists = APPROVED_USERS.some((user) => user.id === user_id);

  if (userExists) {
    bot.sendMessage(chatId, `Привет, ${user_first_name}!`, mainMenuKeyboard);
  } else {
    bot.sendMessage(chatId, "Access denied");
    if (!new_users.some((user) => user.id === user_id)) {
      new_users.push({
        id: user_id,
        username: user_nickname,
        first_name: user_first_name,
      });
      fs.writeFileSync(NEW_USERS_FILE, JSON.stringify(new_users, null, 2));
    }
  }
});

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const user_id = msg.from.id.toString();

  if (msg.text === "Новые пользователи" && user_id === DIMOVSKI_ID) {
    if (new_users.length > 0) {
      const keyboard = new_users.map((user) => [
        {
          text: `${user.username} (ID: ${user.id})`,
          callback_data: `approve_${user.id}`,
        },
      ]);
      const options = {
        reply_markup: {
          inline_keyboard: keyboard,
        },
      };
      bot.sendMessage(chatId, "Выберите пользователя для одобрения:", options);
    } else {
      bot.sendMessage(chatId, "Нет новых пользователей.");
    }
  }

  if (msg.text === "Удалить пользователей" && user_id === DIMOVSKI_ID) {
    if (APPROVED_USERS.length > 0) {
      const filtered_users = APPROVED_USERS.filter(
        (user) => user.id !== DIMOVSKI_ID
      );
      const keyboard = filtered_users.map((user) => [
        {
          text: `${user.username} (ID: ${user.id})`,
          callback_data: `delete_${user.id}`,
        },
      ]);
      const options = {
        reply_markup: {
          inline_keyboard: keyboard,
        },
      };
      bot.sendMessage(chatId, "Выберите пользователя для удаления:", options);
    } else {
      bot.sendMessage(chatId, "Нет одобренных пользователей.");
    }
  }

  if (msg.text === "Список пользователей" && APPROVED_USERS.length > 0) {
    const keyboard = APPROVED_USERS.map((user) => [
      {
        text: `${user.first_name}`,
        url: `https://t.me/${user.username}`,
      },
    ]);
    const options = {
      reply_markup: {
        inline_keyboard: keyboard,
      },
    };
    bot.sendMessage(
      chatId,
      "Выберите пользователя для открытия диалога:",
      options
    );
  }
});

// Обработка нажатий на кнопки
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const user_id = query.from.id.toString();

  if (user_id === DIMOVSKI_ID) {
    if (query.data.startsWith("approve_")) {
      const userIdToApprove = query.data.split("_")[1];
      const userToApprove = new_users.find(
        (user) => user.id === userIdToApprove
      );

      if (
        userToApprove &&
        !APPROVED_USERS.some((user) => user.id === userIdToApprove)
      ) {
        APPROVED_USERS.push(userToApprove);
        fs.writeFileSync(
          APPROVED_USERS_FILE,
          JSON.stringify(APPROVED_USERS, null, 2)
        );

        // Удаляем пользователя из списка новых пользователей после одобрения
        new_users = new_users.filter((user) => user.id !== userIdToApprove);
        fs.writeFileSync(NEW_USERS_FILE, JSON.stringify(new_users, null, 2));

        bot.sendMessage(
          chatId,
          `Пользователь ${userToApprove.username} с ID ${userIdToApprove} был добавлен в список одобренных.`
        );
      } else {
        bot.sendMessage(
          chatId,
          `Пользователь с ID ${userIdToApprove} уже в списке одобренных или не найден.`
        );
      }
    } else if (query.data.startsWith("delete_")) {
      const userIdToDelete = query.data.split("_")[1];
      const userToDelete = APPROVED_USERS.find(
        (user) => user.id === userIdToDelete
      );

      if (userToDelete) {
        APPROVED_USERS = APPROVED_USERS.filter(
          (user) => user.id !== userIdToDelete
        );
        fs.writeFileSync(
          APPROVED_USERS_FILE,
          JSON.stringify(APPROVED_USERS, null, 2)
        );

        bot.sendMessage(
          chatId,
          `Пользователь ${userToDelete.nickname} с ID ${userIdToDelete} был удален из списка одобренных.`
        );
      } else {
        bot.sendMessage(
          chatId,
          `Пользователь с ID ${userIdToDelete} не найден в списке одобренных.`
        );
      }
    }
  } else {
    bot.sendMessage(chatId, "Access denied");
  }
});

bot.on("polling_error", (error) => {
  console.error(`[Polling Error]: ${error.message}`);
});
