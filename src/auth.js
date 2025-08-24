import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;


// Хеш пароля
export const makeHash = (plain) => bcrypt.hash(plain, SALT_ROUNDS);


// Сравниваем введеный пароль с хешем из БД
export const checkPassword = (plain, hash) => bcrypt.compare(plain, hash);


// Создать JWT токен с userId и role
export const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '2h',
  });


// Проверка токена и вернуть payload
export const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

