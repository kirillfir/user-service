Рекомендуется читать как CODE.
# User Service — Test Task (Node.js + Express + PostgreSQL)

Реализуется сервис управления пользователями с базовыми функциями.

## Функционал по заданию
- Регистрация пользователя
- Авторизация (JWT)
- Получение пользователя по ID (сам/админ)
- Получение списка пользователей (только админ)
- Блокировка пользователя (сам себя или админ)

## Технологии
- Node.js
- Express
- PostgreSQL
- bcrypt
- JWT (jsonwebtoken)
- dotenv

## Структура проекта
src/
 ├── lib/                # служебные модули
 │    ├── auth.js        # работа с JWT, хеширование паролей
 │    ├── db.js          # подключение и запросы к базе
 │    └── validators.js  # простые валидаторы (email, дата)
 │
 ├── middlewares/        # промежуточные обработчики
 │    ├── auth.middleware.js   # проверка токена и прав
 │    └── error.middleware.js  # единый обработчик ошибок
 │
 ├── routes/             # маршруты API
 │    ├── auth.routes.js   # регистрация и логин
 │    └── users.routes.js  # операции над пользователями
 │
 ├── sql/                # SQL-запросы (опционально, если нужно хранить отдельно)
 │
 ├── app.js              # подключение middlewares и маршрутов
 └── server.js           # запуск сервера


## Установка и запуск

# Клонировать репозиторий
git clone <repo-url>
cd user-service

# Установить зависимости
npm install

# Создать .env файл (пример см. в .env.example)

# Запуск сервера
npm run dev


## Эндпоинты

# Auth
POST /api/auth/register — регистрация

POST /api/auth/login — логин (получение JWT)

# Users 
GET /api/users/:id — получить пользователя по ID (сам или админ)

GET /api/users — список пользователей (только админ)

PATCH /api/users/:id/role — смена роли (только админ)

PATCH /api/users/:id — блокировка (is_active=false) — сам себя или админ

# Пример запросов 
- Регистрация
curl -X POST http://localhost:3000/api/auth/register \
-H "Content-Type: application/json" \
-d '{"fullName":"Test User","birthDate":"2000-01-01","email":"test@example.com","password":"123456"}'

- Логин
curl -X POST http://localhost:3000/api/auth/login \
-H "Content-Type: application/json" \
-d '{"email":"test@example.com","password":"123456"}'

- Получение пользователя
curl -X GET http://localhost:3000/api/users/1 \
-H "Authorization: Bearer <jwt_token>"

- Получение списка пользователей (для админа)
curl -X GET "http://localhost:3000/api/users?limit=10&offset=0" \
-H "Authorization: Bearer <jwt_token>"

- Смена роли пользователя (только админ)
curl -X PATCH http://localhost:3000/api/users/2/role \
-H "Authorization: Bearer <jwt_token>" \
-H "Content-Type: application/json" \
-d '{"role": "admin"}'


- Блокировка пользователя
curl -X PATCH http://localhost:3000/api/users/1 \
-H "Authorization: Bearer <jwt_token>" \
-H "Content-Type: application/json" \
-d '{"is_active": false}'



# Все приватные эндпоинты требуют заголовок
Authorization: Bearer <jwt_token>

## JWT содержит 
{
  "userId": 1,
  "role": "admin",
  "iat": 1234567890,
  "exp": 1234569999
}




Author kirillfir

