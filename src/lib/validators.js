// Утилиты проверки

// Валидация email
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// birthDate должен быть в формате YYYY-MM-DD
export function isValidBirthDate(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}