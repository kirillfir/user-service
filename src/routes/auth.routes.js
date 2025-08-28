// auth.routes.js — роуты аутентификации: /api/auth/*

import { Router } from 'express';
import { q } from '../lib/db.js';
import { makeHash, checkPassword, signToken } from '../lib/auth.js';
import { emailRegex, isValidBirthDate } from '../lib/validators.js';

const router = Router();

// POST /api/auth/register — регистрация нового пользователя
router.post('/register', async (req, res) => {
  try {
    const { fullName, birthDate, email, password } = req.body || {};

    // Нормализуем поля
    const fullNameNorm = String(fullName || '').trim();
    const birthDateNorm = String(birthDate || '').trim();
    const emailNorm     = String(email || '').trim().toLowerCase();  // ← нормализация

    // Валидируем обязательные поля
    if (!fullNameNorm || !birthDateNorm || !emailNorm || !password) {
      return res.status(400).json({ message: 'fullName, birthDate, email, password обязательны' });
    }
    if (!emailRegex.test(emailNorm)) {
      return res.status(400).json({ message: 'Неправильный формат email' });
    }
    if (!isValidBirthDate(birthDateNorm)) {
      return res.status(400).json({ message: 'birthDate должен быть в формате YYYY-MM-DD' });
    }

    // Email должен быть свободен (проверяем без учёта регистра)
    const exists = await q('SELECT id FROM users WHERE LOWER(email)=LOWER($1)', [emailNorm]);
    if (exists.rowCount) {
      return res.status(409).json({ message: 'Email уже используется' });
    }

    // Хешируем пароль
    const passwordHash = await makeHash(password);

    // Создаём пользователя
    const sql = `
      INSERT INTO users(full_name, birth_date, email, password_hash)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email
    `;
    const params = [fullNameNorm, birthDateNorm, emailNorm, passwordHash];
    const { rows: [u] } = await q(sql, params);

    res.status(201).json(u);
  } catch (e) {
    console.error('register error:', e);
    res.status(500).json({ message: 'Internal error' });
  }
});

// POST /api/auth/login — авторизация
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const emailNorm = String(email || '').trim().toLowerCase();      // ← нормализация

    if (!emailNorm || !password) {
      return res.status(400).json({ message: 'email и password обязательны' });
    }

    // Ищем пользователя (без учёта регистра)
    const sql = `
      SELECT id, email, password_hash, role, is_active
      FROM users
      WHERE LOWER(email) = LOWER($1)
    `;
    const result = await q(sql, [emailNorm]);

    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ message: 'Пользователь заблокирован' });
    }

    const ok = await checkPassword(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const token = signToken({ userId: user.id, role: user.role });
    res.json({ token });
  } catch (e) {
    console.error('login error:', e);
    res.status(500).json({ message: 'Internal error' });
  }
});

export default router;
