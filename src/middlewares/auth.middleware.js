// auth.middleware.js — миддлвары безопасности
import { verifyToken } from '../lib/auth.js';

// проверяем Bearer-токен, кладём user в req
export function auth(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const [type, token] = h.split(' ');
    if (type !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Необходим токен' });
    }
    const payload = verifyToken(token); // { userId, role, iat, exp }
    req.user = { id: payload.userId, role: payload.role };
    next();
  } catch {
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
