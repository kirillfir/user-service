-- Создаём таблицу пользователей
CREATE TABLE IF NOT EXISTS users(
  id SERIAL PRIMARY KEY, -- уникальный идентификатор пользователя(автоинкремент)
  full_name     VARCHAR(100) NOT NULL, -- полное имя пользователя
  birth_date    DATE NOT NULL, -- дата рождения
  email         VARCHAR(100) NOT NULL UNIQUE, -- электронная почта(уникальная)
  password_hash TEXT NOT NULL, -- хешированный пароль
  role          VARCHAR(10)  NOT NULL DEFAULT 'user', -- 'user' | 'admin' 
  is_active     BOOLEAN      NOT NULL DEFAULT true, -- флаг активности пользователя
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(), -- дата создания
  updated_at    TIMESTAMP    NOT NULL DEFAULT NOW() -- дата обновления
);

-- Индекс по role + is_active:
-- нужен, чтобы админ быстрее фильтровал пользователей
-- (например, выбрать всех активных user или всех заблокированных admin)
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);

