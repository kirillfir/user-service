// Подключаем зависимости
import express from 'express';   // сам веб-сервер
import helmet from 'helmet';     // базовая защита HTTP-заголовками
import morgan from 'morgan';     // красивые логи запросов в консоль
import 'dotenv/config';          // чтобы .env подхватился автоматически



import { ping, q } from './db.js'; // Подключаем нашу БД-помощницу
import { makeHash } from './auth.js'; // Утилита для хеша пароля

// Создаём приложение Express
const app = express();


// Подключаем “сервиски” (middlewares)
app.use(express.json()); // Чтобы парсить JSON в теле запросов (POST, PUT)
app.use(helmet()); // безопасные заголовки
app.use(morgan('dev')); // логи(метод, путь, статус, время)


// Маршрут-проверка, жив ли сервер и БД
// GET /health
app.get('/health', async(_req, res) =>{
    const dbOk = await ping();
    res.json({
        status: 'ok',
        db: dbOk ? 'up' : 'down'
    });
});

// Примитивная проверка email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Регистрация нового юзера
// POST /api/auth/register
app.post('/api/auth/register', async(req, res) =>{
    try{
        //Забираем данные из тела запроса
        const{fullName, birthDate, email, password} = req.body || {};

        // Проверяем что поля пришли или нет
        if(!fullName || !birthDate || !email || !password){
            return res.status(400).json({
                message:  'fullName, birthDate, email, password are required'
            });
        }
    

    // Проверяем формат email
    if(!emailRegex.test(email)){
        return res.status(400).json({ message: 'Invalid email format' });
    }

    // Проверяем формат даты (просто: YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      return res.status(400).json({ message: 'birthDate must be YYYY-MM-DD' });
    }

    // Проверяем, что такой email свободен
    //    — безопасный запрос с плейсхолдером $1
    const exists = await q('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rowCount) {
      return res.status(409).json({ message: 'Email already in use' }); // 409 = конфликт
    }

    // Хешируем пароль
    const passwordHash = await makeHash(password);

    const sql = `
    INSERT INTO users(full_name, birth_date, email, password_hash)
    VALUES ($1, $2, $3, $4)
    RETURNING id, email
    `;

    const params = [fullName, birthDate, email, passwordHash];

    // Выполняем запрос в базу
    const result = await q(sql, params);

    // Берём массив строк (rows)
    const rows = result.rows;
    
    // Извлекаем первую строку (INSERT RETURNING)
    const u = rows[0];

    //Отдаем успешный ответ [201 Created]
    res.status(201).json(u);
} catch (e) {
    console.error('register error:', e);
    res.status(500).json({ message: 'Internal error' });
  }
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
