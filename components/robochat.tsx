"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  roomId: string;
  author: string;
  text: string;
  createdAt: number;
};

type RoomPreview = {
  id: string;
  lastText: string;
  lastMessageAt: number;
};

function formatTime(value: number) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function roomLabel(roomId: string) {
  return roomId.charAt(0).toUpperCase() + roomId.slice(1);
}

function sanitizeRoomId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32) || "general";
}

const defaultRooms: RoomPreview[] = [
  { id: "general", lastText: "Общий чат", lastMessageAt: Date.now() },
  { id: "work", lastText: "Рабочие вопросы", lastMessageAt: Date.now() - 1000 },
  { id: "friends", lastText: "Друзья", lastMessageAt: Date.now() - 2000 }
];

export function RoboChat() {
  const [nickname, setNickname] = useState("");
  const [joined, setJoined] = useState(false);
  const [roomInput, setRoomInput] = useState("general");
  const [activeRoom, setActiveRoom] = useState("general");
  const [rooms, setRooms] = useState<RoomPreview[]>(defaultRooms);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const roomTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastCreatedAtRef = useRef<number>(0);

  const cleanNickname = useMemo(() => nickname.trim().slice(0, 30), [nickname]);

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

        const response = await fetch(`/api/messages?${params.toString()}`, { cache: "no-store" });
        const payload = (await response.json()) as { messages?: ChatMessage[]; error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Ошибка загрузки сообщений");
        }

        const incoming = payload.messages ?? [];
        if (cancelled || incoming.length === 0) {
          return;
        }

        setMessages((prev) => {
          const map = new Map(prev.map((message) => [message.id, message]));
          incoming.forEach((message) => map.set(message.id, message));
          const merged = Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);
          const last = merged[merged.length - 1];
          if (last) {
            lastCreatedAtRef.current = Math.max(lastCreatedAtRef.current, last.createdAt);
          }
          return merged.slice(-120);
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Ошибка сервера");
        }
      }
    }

    setMessages([]);
    setError("");
    lastCreatedAtRef.current = 0;

    fetchMessages(true);
    timerRef.current = setInterval(() => fetchMessages(false), 1200);

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [joined, activeRoom]);

  useEffect(() => {
    if (!joined) {
      return;
    }

    let cancelled = false;

    async function fetchRooms() {
      try {
        const response = await fetch("/api/rooms", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { rooms?: RoomPreview[] };
        if (cancelled || !payload.rooms || payload.rooms.length === 0) {
          return;
        }

        setRooms((prev) => {
          const map = new Map(prev.map((room) => [room.id, room]));
          payload.rooms?.forEach((room) => map.set(room.id, room));
          return Array.from(map.values()).sort((a, b) => b.lastMessageAt - a.lastMessageAt).slice(0, 30);
        });
      } catch {
        // ignored
      }
    }

    fetchRooms();
    roomTimerRef.current = setInterval(fetchRooms, 3000);

    return () => {
      cancelled = true;
      if (roomTimerRef.current) {
        clearInterval(roomTimerRef.current);
      }
    };
  }, [joined]);

  function joinChat(event: FormEvent) {
    event.preventDefault();

    if (!cleanNickname) {
      setError("Введите ник.");
      return;
    }

    const room = sanitizeRoomId(roomInput);
    setActiveRoom(room);
    setRoomInput(room);
    setJoined(true);
    setError("");
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();

    const text = draft.trim();
    if (!text) {
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: activeRoom, author: cleanNickname, text })
      });

      const payload = (await response.json()) as { message?: ChatMessage; error?: string };
      if (!response.ok || !payload.message) {
        throw new Error(payload.error ?? "Не удалось отправить сообщение.");
      }

      setMessages((prev) => [...prev, payload.message!]);
      setDraft("");
      lastCreatedAtRef.current = Math.max(lastCreatedAtRef.current, payload.message.createdAt);
      setRooms((prev) => {
        const filtered = prev.filter((room) => room.id !== activeRoom);
        return [{ id: activeRoom, lastText: payload.message!.text, lastMessageAt: payload.message!.createdAt }, ...filtered];
      });
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
          <p>Интерфейс в стиле Telegram + база в Vercel Postgres.</p>
          <form className="join-form" onSubmit={joinChat}>
            <label>
              Ваш ник
              <input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="alex" />
            </label>
            <label>
              Комната
              <input value={roomInput} onChange={(event) => setRoomInput(event.target.value)} placeholder="general" />
            </label>
            {error && <p className="error-text">{error}</p>}
            <button type="submit">Войти в RoboChat</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="layout">
      <aside className="sidebar">
        <div className="brand">RoboChat</div>
        <input
          className="search"
          value={roomInput}
          onChange={(event) => setRoomInput(event.target.value)}
          placeholder="Новая комната"
        />
        <button
          className="add-room"
          type="button"
          onClick={() => {
            const room = sanitizeRoomId(roomInput);
            setActiveRoom(room);
            setRoomInput(room);
            setRooms((prev) => {
              if (prev.some((item) => item.id === room)) {
                return prev;
              }
              return [{ id: room, lastText: "Новая комната", lastMessageAt: Date.now() }, ...prev];
            });
          }}
        >
          Открыть комнату
        </button>

        <div className="chat-list">
          {rooms.map((room) => (
            <button
              key={room.id}
              className={`chat-item ${activeRoom === room.id ? "active" : ""}`}
              onClick={() => setActiveRoom(room.id)}
            >
              <div className="chat-avatar">{room.id[0].toUpperCase()}</div>
              <div className="chat-meta">
                <p className="chat-name">{roomLabel(room.id)}</p>
                <p className="chat-status">{room.lastText}</p>
              </div>
              <span className="chat-time">{formatTime(room.lastMessageAt)}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="chat-view">
        <header className="chat-header">
          <h1>#{activeRoom}</h1>
          <span>{cleanNickname}</span>
        </header>

        <div className="messages">
          {messages.length === 0 && <p className="chat-status">Пока пусто. Напишите первое сообщение 👋</p>}
          {messages.map((message) => {
            const isMe = message.author === cleanNickname;
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
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Сообщение" />
          <button type="submit" disabled={isSending}>
            {isSending ? "..." : "Отправить"}
          </button>
        </form>
        {error && <p className="composer-error">{error}</p>}
      </section>
    </main>
  );
}
