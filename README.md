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
├─ server.js — сервер Express (эндпоинты)
├─ db.js — подключение к PostgreSQL
├─ auth.js — хэш паролей и JWT
└─ sql/
└─ 001_init.sql — создание таблицы users

Author kirillfir

