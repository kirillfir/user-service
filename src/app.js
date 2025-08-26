// app.js — тут собираем приложение: миддлвары, health, роуты, обработчик ошибок

import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import 'dotenv/config';

import { ping } from './lib/db.js'; // проверка БД для /health
import authRoutes from './routes/auth.routes.js';   // /api/auth/*
import usersRoutes from './routes/users.routes.js'; // /api/users/*
import { errorMiddleware } from './middlewares/error.middleware.js';

const app = express();

// Подключаем «сервиски» (middlewares)
app.use(express.json()); // парсим JSON-тела запросов
app.use(helmet());       // безопасные заголовки
app.use(morgan('dev'));  // красивые логи

// Пробный маршрут — жив ли сервер и БД
app.get('/health', async (_req, res) => {
  const dbOk = await ping();
  res.json({ status: 'ok', db: dbOk ? 'up' : 'down' });
});

// Монтируем наши роуты
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

// Единый обработчик ошибок — ставим последним
app.use(errorMiddleware);

export default app;
