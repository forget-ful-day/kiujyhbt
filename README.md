# RoboChat (Telegram-style)

RoboChat — чат в стиле Telegram на Next.js.

## Что уже сделано

- Левая колонка чатов (комнаты), похожая на Telegram.
- Основная область переписки с пузырями сообщений.
- Хранение сообщений в **Vercel Postgres**.
- API:
  - `GET /api/messages?room=...&after=...`
  - `POST /api/messages`
  - `GET /api/rooms`

---

## Подробно: как создать БД в Vercel и что куда вставлять

### Шаг 1. Залить проект в GitHub

1. Создайте репозиторий на GitHub.
2. Запушьте код RoboChat.

### Шаг 2. Импортировать проект в Vercel

1. Зайдите в [https://vercel.com](https://vercel.com).
2. Нажмите **Add New → Project**.
3. Выберите ваш GitHub-репозиторий `robochat`.
4. Нажмите **Deploy** (первый деплой можно сделать даже до создания БД).

### Шаг 3. Создать БД в Vercel

1. Откройте проект в Vercel.
2. Перейдите: **Storage → Create Database → Postgres**.
3. Выберите регион (лучше ближе к вашей аудитории).
4. Нажмите **Create**.
5. Нажмите **Connect Project** и выберите ваш проект RoboChat.

После подключения Vercel автоматически добавит переменные окружения в проект:

- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

> Вставлять вручную обычно ничего не нужно — они подтягиваются автоматически после **Connect Project**.

### Шаг 4. Передеплой

1. В проекте Vercel откройте **Deployments**.
2. Нажмите **Redeploy** на последнем деплое (или просто сделайте новый commit/push).
3. После редеплоя API начнёт писать/читать сообщения из Postgres.

### Шаг 5. Проверка

1. Откройте сайт в двух вкладках/на двух устройствах.
2. Зайдите под разными никами в одну комнату (например `general`).
3. Отправьте сообщение в одной вкладке — во второй оно появится автоматически.

---

## Локальный запуск с той же БД

```bash
npm install
vercel env pull .env.local
npm run dev
```

Команда `vercel env pull .env.local` скачает те же переменные `POSTGRES_*` из Vercel в локальный `.env.local`.

---

## Важные заметки

- Сейчас обновление сообщений сделано через polling (каждые ~1.2 сек).
- Для полностью realtime как в Telegram (мгновенно без polling) добавьте WebSocket/SSE-слой (например Ably/Pusher).
