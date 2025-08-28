// auth.middleware.js — миддлвары безопасности
import { verifyToken } from '../lib/auth.js';
import { q } from '../lib/db.js'; // нужен для проверки пользователя в БД

// проверяем Bearer-токен, достаём пользователя из базы
export async function auth(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const [type, token] = h.split(' ');
    if (type !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Необходим токен' });
    }

    // расшифровываем токен
    const payload = verifyToken(token); // { userId, role, iat, exp }

    // сверяем с БД — существует ли пользователь и активен ли он
    const sql = 'SELECT id, role, is_active FROM users WHERE id = $1';
    const result = await q(sql, [payload.userId]);

    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Пользователь не найден' });
    }

    if (!result.rows[0].is_active) {
      return res.status(403).json({ message: 'Пользователь заблокирован' });
    }

    // сохраняем актуальные данные в req.user
    req.user = {
      id: result.rows[0].id,
      role: result.rows[0].role,
    };

    next();
  } catch (e) {
    return res.status(401).json({ message: 'Неправильный или истекший токен' });
  }
}

// проверка прав администратора
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Доступ запрещён: только админ' });
  }
  next();
}
