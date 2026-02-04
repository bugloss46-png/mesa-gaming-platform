# MESA - Modern eSports Arena

Платформа для киберспортивных турниров по стратегическим играм (Warcraft III, Star Wars: Empire at War, Company of Heroes).

## Технологический стек

- **Frontend**: TypeScript + Vite
- **Styling**: Vanilla CSS with CSS Variables
- **Database**: localStorage (временное решение для прототипа)
- **Authentication**: Email + 2FA verification code + Steam OAuth (mock)

## Структура проекта

```
Mesa site/
├── src/                    # TypeScript исходники
│   ├── types.ts           # TypeScript типы и интерфейсы
│   ├── auth.service.ts    # Сервис аутентификации
│   ├── main.ts            # Главная страница
│   ├── login.ts           # Страница входа
│   ├── register.ts        # Страница регистрации
│   ├── verify.ts          # 2FA верификация
│   └── dashboard.ts       # Дашборд пользователя
├── *.html                 # HTML страницы
├── styles.css             # Основные стили
├── auth.css               # Стили аутентификации
├── dashboard.css          # Стили дашборда
├── package.json           # Зависимости проекта
├── tsconfig.json          # Конфигурация TypeScript
└── vite.config.ts         # Конфигурация Vite

```

## Установка и запуск

### Установка зависимостей

```bash
npm install
```

### Режим разработки

```bash
npm run dev
```

Приложение будет доступно по адресу: `http://localhost:3000`

### Сборка для продакшена

```bash
npm run build
```

Собранные файлы появятся в папке `dist/`

### Просмотр production build

```bash
npm run preview
```

### Проверка типов

```bash
npm run typecheck
```

## Особенности

### Аутентификация

- **Email/Password**: Регистрация с валидацией (пароль только на английском, минимум 8 символов, буква + цифра)
- **2FA**: 6-значный код верификации с истечением через 5 минут
- **Steam OAuth**: Mock-реализация для демонстрации

### База данных

Текущая реализация использует `localStorage` для хранения:
- Пользователи
- Сессии
- Коды верификации

В продакшен-версии требуется замена на настоящую базу данных (PostgreSQL/MongoDB).

### Цветовая схема

- **Оранжевый**: `#f97316` (основной)
- **Синий**: `#0ea5e9` (акцент)
- **Градиенты**: Комбинации оранжевого и синего

### Игры

- Warcraft III (Melee & Custom maps)
- Star Wars: Empire at War
- Company of Heroes 1/2

## Миграция на React/Next.js

Текущая архитектура позволяет легко мигрировать на React:
1. Типы уже определены в `src/types.ts`
2. Логика изолирована в сервисах (например, `auth.service.ts`)
3. Компоненты можно создавать на основе существующих HTML-секций

## Roadmap

- [ ] Backend API (Node.js/Python)
- [ ] Настоящая база данных
- [ ] WebSocket для live-матчей
- [ ] Реальная интеграция Steam OAuth
- [ ] Email-сервис для кодов верификации
- [ ] Система рейтинга ELO
- [ ] Matchmaking алгоритм
- [ ] Админ-панель

## Лицензия

Proprietary
