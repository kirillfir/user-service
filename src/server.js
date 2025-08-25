// Подключаем зависимости
import express from 'express';   // сам веб-сервер
import helmet from 'helmet';     // базовая защита HTTP-заголовками
import morgan from 'morgan';     // красивые логи запросов в консоль
import 'dotenv/config';          // чтобы .env подхватился автоматически



import { ping, q } from './db.js'; // Подключаем нашу БД-помощницу
import { makeHash, verifyToken } from './auth.js'; // Утилита для хеша пароля
import { checkPassword, signToken} from './auth.js'; // Подключаем иснтсрументы для проверки пароля

// Создаём приложение Express
const app = express();


// Подключаем сервиски (middlewares)
app.use(express.json()); // Чтобы парсить JSON в теле запросов (POST, PUT)
app.use(helmet()); // безопасные заголовки
app.use(morgan('dev')); // логи(метод, путь, статус, время)

// Авторизация
function auth(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const [type, token] = h.split(' ');
    if (type !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const payload = verifyToken(token); // { userId, role, iat, exp }
    req.user = { id: payload.userId, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}


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
                message:  'fullName, birthDate, email, password обязательны'
            });
        }
    

    // Проверяем формат email
    if(!emailRegex.test(email)){
        return res.status(400).json({ message: 'Неправильный формат email' });
    }

    // Проверяем формат даты (просто: YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      return res.status(400).json({ message: 'birthDate должен быть в формате YYYY-MM-DD' });
    }

    // Проверяем, что такой email свободен
    //    — безопасный запрос с плейсхолдером $1
    const exists = await q('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rowCount) {
      return res.status(409).json({ message: 'Email уже используется' }); // 409 = конфликт
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

// Авторизация (логин)
// POST /api/auth/login
app.post('/api/auth/login', async(req,res) =>{
    try{
       const{ email, password } = req.body || {};
       
       // Проверка, что поля пришли
       if(!email || !password){
           return res.status(400).json({message: 'email и password обязательны'});
       }

       // Ищем пользователя в БД
       const sql = `    
       SELECT id, email, password_hash, role, is_active
       FROM users
       WHERE email = $1
       `;
       const result = await q(sql, [email]);

       if (result.rowCount === 0){
        return res.status(401).json({message: 'Неверный email или пароль'}); 
       }

       const user = result.rows[0];

       // Проверяем активен ли пользователь 
       if(!user.is_active){
        return res.status(403).json({message: 'Пользователь заблокирован'});
       }

       // Сравниваем пароль с хэшем
       const ok = await checkPassword(password, user.password_hash);
       if(!ok){
        return res.status(401).json({message: 'Неверный email или пароль'})
       }

       // Генерим токен с userId и role
       const token = signToken({userId: user.id, role: user.role});

       // Отдаем токен клиенту
       res.json({token});
    } catch(e){
        console.error('login error', e);
        res.status(500).json({message: 'Internal error'});
    }
});

// PATCH /api/users/:id/role смена роли пользователя
// Доступ: только админ
app.patch('/api/users/:id/role', auth, async (req, res) => {
  try {
    // Проверка: админ ли автор запроса
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещён: только админ' });
    }

    // Получаем id из URL
    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      return res.status(400).json({ message: 'Неверный ID пользователя' });
    }

    // Получаем новую роль из тела запроса
    const { role } = req.body || {};
    if (role !== 'admin' && role !== 'user') {
      return res.status(400).json({ message: 'Роль должна быть admin или user' });
    }

    // Обновляем в БД
    const sql = `
      UPDATE users
      SET role = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, full_name, email, role, is_active, updated_at
    `;
    const result = await q(sql, [role, targetId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json(result.rows[0]);
  } catch (e) {
    console.error('update role error:', e);
    res.status(500).json({ message: 'Internal error' });
  }
});

// GET /api/users/:id — получить одного пользователя
// Доступ: сам или админ
app.get('/api/users/:id', auth, async(req,res) =>{
   try{
    // Берем id из URL и приводим к числу
    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      return res.status(400).json({ message: 'Неверный ID пользователя' });
    }

    // Проверка пользовательского статуса
    const isSelf = req.user.id === targetId;
    const isAdmin = req.user.role === 'admin';
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }

    // Тянем пользователя из бд
    const sql = `
    SELECT id, full_name, birth_date, email, role, is_active, created_at, updated_at
    FROM users
    WHERE id = $1
    `;

     const result = await q(sql, [targetId]);

    //Если не нашли 404
    if (result.rowCount === 0)
    {
        return res.status(404).json({message: 'Пользователь не найден'});
    }

    // Выводим пользователя
    res.json(result.rows[0])
   }catch (e) {
    console.error('get user by id error:', e);
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
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
