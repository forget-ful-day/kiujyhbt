# RoboChat

RoboChat — чат в стиле Telegram на Next.js с **файловой БД**.
Сообщения хранятся в `data/messages.json` и доступны всем пользователям одной комнаты.

## Как работает

- Пользователь вводит ник и комнату.
- Сообщения пишутся в API `POST /api/messages`.
- Клиент обновляет чат каждые 1.5 сек через `GET /api/messages`.
- Хранилище: JSON-файл `data/messages.json`.

## Структура

- `app/api/messages/route.ts` — API для чтения/записи сообщений.
- `lib/file-db.ts` — работа с файловой БД.
- `data/messages.json` — сама база данных.

## Локальный запуск

```bash
npm install
npm run dev
```

Открыть: http://localhost:3000

## Деплой на Vercel

```bash
vercel
```

Или через GitHub → Vercel Dashboard → Deploy.

### Важно про файловую БД на Vercel

На Vercel файловая система временная (ephemeral), поэтому `data/messages.json` может сбрасываться между деплоями/инстансами.
Для постоянного хранения в production лучше заменить файловую БД на внешнюю (Postgres, Supabase, Redis и т.д.).
