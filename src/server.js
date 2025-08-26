// server.js — «включатель» сервера: читает порт и запускает .listen

import app from './app.js'; // наше готовое Express-приложение

// Читаем порт из .env или ставим 3000 по умолчанию
const PORT = Number(process.env.PORT) || 3000;

// Стартуем сервер
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});