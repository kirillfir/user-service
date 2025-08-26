// error.middleware.js — централизованная обработка ошибок
// если где-то бросим throw или next(err), придём сюда

export function errorMiddleware(err, _req, res, _next) {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Внутренняя ошибка' });
}