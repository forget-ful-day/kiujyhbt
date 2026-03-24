# RoboChat

RoboChat — **реальный чат для людей** в стиле Telegram на Next.js.
Сообщения синхронизируются через **Firebase Realtime Database**, поэтому два и более пользователя могут общаться в одной комнате в реальном времени.

## Что умеет

- Вход по нику и названию комнаты.
- Общая переписка для всех пользователей комнаты.
- Realtime-обновления без перезагрузки страницы.
- Готовый деплой на Vercel.

## 1) Подготовка Firebase

1. Создайте проект в Firebase Console.
2. Включите **Realtime Database** (режим test для старта).
3. В настройках проекта создайте Web App и скопируйте конфиг.
4. Возьмите значения и заполните переменные окружения:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## 2) Локальный запуск

```bash
npm install
npm run dev
```

Открыть: http://localhost:3000

## 3) Деплой на Vercel (по новой)

1. Залейте репозиторий в GitHub.
2. В Vercel: **Add New Project** → выберите репозиторий.
3. В разделе **Environment Variables** добавьте все `NEXT_PUBLIC_FIREBASE_*` переменные.
4. Нажмите **Deploy**.

После деплоя откройте сайт, введите ник/комнату (например `general`) и общайтесь с другими людьми, у которых открыта та же комната.

## Примечание по безопасности

Для production обязательно ограничьте правила Realtime Database (security rules), чтобы избежать спама и несанкционированной записи.
