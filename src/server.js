// Подключаем зависимости
import express from 'express';   // сам веб-сервер
import helmet from 'helmet';     // базовая защита HTTP-заголовками
import morgan from 'morgan';     // красивые логи запросов в консоль
import 'dotenv/config';          // чтобы .env подхватился автоматически


// Подключаем нашу БД-помощницу
import { ping } from './db.js';


// Создаём приложение Express
const app = express();


// Подключаем “сервиски” (middlewares)
app.use(express.json()); // Чтобы парсить JSON в теле запросов (POST, PUT)
app.use(helmet()); // безопасные заголовки
app.use(morgan('dev')); // логи(метод, путь, статус, время)

// Маршрут-проверка, жив ли сервер и БД
app.get('/health', async(_req, res) =>{
    const dbOk = await ping();
    res.json({
        status: 'ok',
        db: dbOk ? 'up' : 'down'
    });
});

// Единый обработчик ошибок (если в коде случится throw)
// Возвращает JSON вместо падения процесса код 500 ошибка сервера
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal error' });
});

// Читаем порт из .env или ставим по умолчанию 3000
const PORT = Number(process.env.PORT) || 3000;

// Запускаем сервер
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
