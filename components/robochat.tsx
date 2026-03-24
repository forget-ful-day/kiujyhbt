"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  author: string;
  text: string;
  createdAt: number;
};

type JoinForm = {
  nickname: string;
  roomId: string;
};

function formatTime(value: number) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function sanitizeRoomId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32) || "general";
}

export function RoboChat() {
  const [joinForm, setJoinForm] = useState<JoinForm>({ nickname: "", roomId: "general" });
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastCreatedAtRef = useRef<number>(0);

  const activeRoom = useMemo(() => sanitizeRoomId(joinForm.roomId), [joinForm.roomId]);
  const nickname = useMemo(() => joinForm.nickname.trim().slice(0, 30), [joinForm.nickname]);

  useEffect(() => {
    if (!joined) {
      return;
    }

    let cancelled = false;

    async function fetchMessages(initial = false) {
      try {
        const params = new URLSearchParams({ room: activeRoom });
        if (!initial && lastCreatedAtRef.current > 0) {
          params.set("after", String(lastCreatedAtRef.current));
        }

        const response = await fetch(`/api/messages?${params.toString()}`, {
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error("Не удалось загрузить сообщения.");
        }

        const payload = (await response.json()) as { messages: ChatMessage[] };
        if (cancelled || payload.messages.length === 0) {
          return;
        }

        setMessages((prev) => {
          const map = new Map(prev.map((message) => [message.id, message]));
          payload.messages.forEach((message) => map.set(message.id, message));
          const merged = Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);
          const last = merged[merged.length - 1];
          if (last) {
            lastCreatedAtRef.current = Math.max(lastCreatedAtRef.current, last.createdAt);
          }
          return merged.slice(-120);
        });
      } catch {
        if (!cancelled) {
          setError("Проблема с сервером чата. Повторите попытку.");
        }
      }
    }

    setMessages([]);
    setError("");
    lastCreatedAtRef.current = 0;

    fetchMessages(true);
    timerRef.current = setInterval(() => {
      fetchMessages(false);
    }, 1500);

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [joined, activeRoom]);

  function joinChat(event: FormEvent) {
    event.preventDefault();

    if (!nickname) {
      setError("Введите имя пользователя.");
      return;
    }

    setError("");
    setJoined(true);
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();

    const text = draft.trim();
    if (!text || !joined) {
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: activeRoom,
          author: nickname,
          text
        })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Не удалось отправить сообщение");
      }

      const payload = (await response.json()) as { message: ChatMessage };
      setMessages((prev) => [...prev, payload.message]);
      lastCreatedAtRef.current = Math.max(lastCreatedAtRef.current, payload.message.createdAt);
      setDraft("");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить сообщение.");
    } finally {
      setIsSending(false);
    }
  }

  if (!joined) {
    return (
      <main className="join-layout">
        <section className="join-card">
          <h1>RoboChat</h1>
          <p>Чат с файловой БД. Люди пишут в одну комнату и видят сообщения друг друга.</p>

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
        <p className="chat-status">Обновление: каждые 1.5 сек</p>
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
