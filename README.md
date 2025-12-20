# Хако ИИ (Hacko AI)

AI чат-платформа с поддержкой множественных LLM, голосового ввода/вывода, RAG и автоматической классификации.

## Технологический стек

**Frontend:** React 19 + TypeScript + Vite + Socket.IO + Web Speech API

**Backend:** Node.js + Express + TypeScript + Socket.IO + OpenAI SDK + Anthropic SDK + SQLite

## Что умеет

- Потоковый чат с множественными LLM (OpenAI, Anthropic, Groq, OpenRouter, Ollama)
- Голосовой ввод и автоматическое озвучивание ответов
- Загрузка и анализ документов (PDF, DOC, DOCX, TXT) через RAG
- Система специализированных агентов (Поддержка, Программист, Ассистент)
- Автоматическая классификация сообщений и создание тикетов
- **Telegram бот** — полноценный AI ассистент в Telegram:
  - Автоматическая регистрация при первом сообщении
  - Общение с AI через бота
  - Команды: `/start`, `/help`, `/clear`, `/agent [название]`
  - Сохранение истории диалога
- Авторизация через SMS/Email/Telegram
- Темная/светлая тема, мультиязычность (RU/EN)

## Быстрый старт

```bash
# Backend
cd backend
npm install
cp env.example .env
npm run dev

# Frontend
cd ../frontend
npm install
npm run dev
```

Откройте http://localhost:5173

## Настройка API ключей

Создайте `backend/.env` и добавьте хотя бы один ключ:

```bash
OPENROUTER_API_KEY=your_key
# или
GROQ_API_KEY=your_key
# или
OPENAI_API_KEY=your_key
```

### Telegram бот (опционально)

1. Найдите @BotFather в Telegram
2. Отправьте `/newbot` и следуйте инструкциям
3. Скопируйте токен (например: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
4. Добавьте в `backend/.env`: `TELEGRAM_BOT_TOKEN=ваш_токен`
5. Перезапустите backend
6. Найдите вашего бота в Telegram и отправьте `/start`

**Важно:** Бот работает локально через polling, публичный URL не нужен.

Полные инструкции: см. `backend/env.example`
