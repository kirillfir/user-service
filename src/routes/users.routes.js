// users.routes.js — роуты пользователей: /api/users/*

import { Router } from 'express';
import { q } from '../lib/db.js';
import { auth, requireAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/users/:id — получить пользователя (сам или админ)
router.get('/:id', auth, async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      return res.status(400).json({ message: 'Неверный ID пользователя' });
    }

    // Право доступа: сам или админ
    const isSelf = req.user.id === targetId;
    const isAdmin = req.user.role === 'admin';
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }

    // Тянем из БД (без password_hash)
    const sql = `
      SELECT id, full_name, birth_date, email, role, is_active, created_at, updated_at
      FROM users
      WHERE id = $1
    `;
    const result = await q(sql, [targetId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json(result.rows[0]);
  } catch (e) {
    console.error('get user by id error:', e);
    res.status(500).json({ message: 'Internal error' });
  }
});

// GET /api/users — список пользователей (только админ)
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100); // ограничим максимум
    const offset = Number(req.query.offset) || 0;

    const sql = `
      SELECT id, full_name, birth_date, email, role, is_active, created_at, updated_at
      FROM users
      ORDER BY id ASC
      LIMIT $1 OFFSET $2
    `;
    const result = await q(sql, [limit, offset]);

    res.json({ items: result.rows, limit, offset });
  } catch (e) {
    console.error('list users error:', e);
    res.status(500).json({ message: 'Internal error' });
  }
});

// PATCH /api/users/:id/role — смена роли (только админ)
router.patch('/:id/role', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещён: только админ' });
    }

    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      return res.status(400).json({ message: 'Неверный ID пользователя' });
    }

    const { role } = req.body || {};
    if (role !== 'admin' && role !== 'user') {
      return res.status(400).json({ message: 'Роль должна быть admin или user' });
    }

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

// PATCH /api/users/:id — блокировка (разрешаем только is_active=false)
// Доступ: админ ИЛИ сам себя
router.patch('/:id', auth, async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      return res.status(400).json({ message: 'Неверный ID пользователя' });
    }

    const { is_active } = req.body || {};
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ message: 'Ожидается поле is_active (boolean)' });
    }
    if (is_active !== false) {
      // В рамках ТЗ — только блокировка
      return res.status(400).json({ message: 'Разрешена только блокировка: is_active должно быть false' });
    }

    const isSelf = req.user.id === targetId;
    const isAdmin = req.user.role === 'admin';
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }

    const sql = `
      UPDATE users
      SET is_active = false,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, full_name, email, role, is_active, updated_at
    `;
    const result = await q(sql, [targetId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json({ message: 'User blocked', user: result.rows[0] });
  } catch (e) {
    console.error('patch user (block) error:', e);
    res.status(500).json({ message: 'Internal error' });
  }
});

export default router;
