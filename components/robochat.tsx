"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  Database,
  getDatabase,
  onChildAdded,
  push,
  ref,
  serverTimestamp,
  query,
  limitToLast
} from "firebase/database";

type ChatMessage = {
  id: string;
  roomId: string;
  author: string;
  text: string;
  createdAt: number;
};

type JoinForm = {
  nickname: string;
  roomId: string;
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

function getMissingEnv() {
  return Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

function createDatabase(): Database {
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  return getDatabase(app);
}

function formatTime(value: number) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function sanitizeRoomId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);
}

export function RoboChat() {
  const [joinForm, setJoinForm] = useState<JoinForm>({ nickname: "", roomId: "general" });
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>("");
  const [isSending, setIsSending] = useState(false);

  const dbRef = useRef<Database | null>(null);

  const activeRoom = useMemo(() => sanitizeRoomId(joinForm.roomId) || "general", [joinForm.roomId]);
  const nickname = useMemo(() => joinForm.nickname.trim().slice(0, 30), [joinForm.nickname]);
  const missingEnv = getMissingEnv();

  useEffect(() => {
    if (!joined) {
      return;
    }

    try {
      const db = dbRef.current ?? createDatabase();
      dbRef.current = db;

      const messagesQuery = query(ref(db, `rooms/${activeRoom}/messages`), limitToLast(100));
      setMessages([]);

      const unsubscribe = onChildAdded(messagesQuery, (snapshot) => {
        const value = snapshot.val() as { author?: string; text?: string; createdAt?: number } | null;
        if (!value?.text || !value?.author) {
          return;
        }

        const message: ChatMessage = {
          id: snapshot.key ?? crypto.randomUUID(),
          roomId: activeRoom,
          author: value.author,
          text: value.text,
          createdAt: typeof value.createdAt === "number" ? value.createdAt : Date.now()
        };

        setMessages((prev) => {
          if (prev.some((item) => item.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });
      });

      return () => {
        unsubscribe();
      };
    } catch {
      setError("Не удалось подключиться к Firebase. Проверьте переменные окружения.");
    }
  }, [joined, activeRoom]);

  function joinChat(event: FormEvent) {
    event.preventDefault();

    if (missingEnv.length > 0) {
      setError(`Заполните env переменные Firebase: ${missingEnv.join(", ")}`);
      return;
    }

    if (!nickname) {
      setError("Введите имя пользователя.");
      return;
    }

    if (!activeRoom) {
      setError("Введите room ID (латиница/цифры). Например: general");
      return;
    }

    setError("");
    setJoined(true);
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();

    const text = draft.trim();
    if (!text || !joined || !dbRef.current) {
      return;
    }

    setIsSending(true);
    try {
      const roomMessagesRef = ref(dbRef.current, `rooms/${activeRoom}/messages`);
      await push(roomMessagesRef, {
        author: nickname,
        text,
        createdAt: serverTimestamp()
      });

      setDraft("");
      setError("");
    } catch {
      setError("Не удалось отправить сообщение. Повторите попытку.");
    } finally {
      setIsSending(false);
    }
  }

  if (!joined) {
    return (
      <main className="join-layout">
        <section className="join-card">
          <h1>RoboChat</h1>
          <p>Реальный чат для людей. Подключи Firebase и общайся в комнате.</p>

          <form className="join-form" onSubmit={joinChat}>
            <label>
              Ваш ник
              <input
                value={joinForm.nickname}
                onChange={(event) => setJoinForm((prev) => ({ ...prev, nickname: event.target.value }))}
                placeholder="Например, Alex"
              />
            </label>

            <label>
              Комната
              <input
                value={joinForm.roomId}
                onChange={(event) => setJoinForm((prev) => ({ ...prev, roomId: event.target.value }))}
                placeholder="general"
              />
            </label>

            {error && <p className="error-text">{error}</p>}

            <button type="submit">Войти в чат</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="layout">
      <aside className="sidebar">
        <div className="brand">RoboChat</div>
        <p className="chat-status">Пользователь: {nickname}</p>
        <p className="chat-status">Комната: #{activeRoom}</p>
      </aside>

      <section className="chat-view">
        <header className="chat-header">
          <h1>Комната #{activeRoom}</h1>
          <span>{messages.length} сообщений</span>
        </header>

        <div className="messages">
          {messages.length === 0 && <p className="chat-status">Пока пусто. Напишите первое сообщение 👋</p>}
          {messages.map((message) => {
            const isMe = message.author === nickname;
            return (
              <div key={message.id} className={`bubble-row ${isMe ? "me" : "bot"}`}>
                <div className={`bubble ${isMe ? "me" : "bot"}`}>
                  <b>{message.author}</b>
                  <p>{message.text}</p>
                  <span>{formatTime(message.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>

        <form className="composer" onSubmit={sendMessage}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Напишите сообщение..."
          />
          <button type="submit" disabled={isSending}>
            {isSending ? "..." : "Отправить"}
          </button>
        </form>
        {error && <p className="composer-error">{error}</p>}
      </section>
    </main>
  );
}
