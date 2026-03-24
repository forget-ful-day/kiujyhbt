"use client";

import { FormEvent, useMemo, useRef, useState } from "react";

type Message = {
  id: string;
  author: "me" | "bot";
  text: string;
  time: string;
};

const contacts = [
  { id: "ai-helper", name: "AI Helper", status: "онлайн" },
  { id: "dev-team", name: "Dev Team", status: "был(а) недавно" },
  { id: "support", name: "Support", status: "онлайн" }
];

const initialMessages: Message[] = [
  {
    id: "1",
    author: "bot",
    text: "Привет! Я RoboChat Bot. Напиши мне что-нибудь 🤖",
    time: "10:01"
  },
  {
    id: "2",
    author: "me",
    text: "Сделай интерфейс как в Telegram",
    time: "10:02"
  },
  {
    id: "3",
    author: "bot",
    text: "Готово — минималистичный стиль, пузыри сообщений и список чатов слева ✅",
    time: "10:03"
  }
];

function formatNow() {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
}

function buildBotReply(userText: string): string {
  const normalized = userText.trim().toLowerCase();

  if (normalized.includes("привет")) {
    return "Привет! Я на связи. Могу ответить или просто поддержать диалог.";
  }

  if (normalized.includes("версел") || normalized.includes("vercel")) {
    return "Этот проект уже готов к деплою на Vercel: npm install && npm run build.";
  }

  if (normalized.includes("помоги")) {
    return "Конечно! Опиши задачу, и я помогу по шагам.";
  }

  return `Я получил сообщение: «${userText}». Можно добавить интеграцию с API для настоящего live-чата.`;
}

export function RoboChat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [activeContact, setActiveContact] = useState(contacts[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  const title = useMemo(() => `RoboChat · ${activeContact.name}`, [activeContact.name]);

  function sendMessage(event: FormEvent) {
    event.preventDefault();

    const text = draft.trim();
    if (!text) {
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      author: "me",
      text,
      time: formatNow()
    };

    setMessages((prev) => [...prev, userMessage]);
    setDraft("");

    const botMessage: Message = {
      id: crypto.randomUUID(),
      author: "bot",
      text: buildBotReply(text),
      time: formatNow()
    };

    setTimeout(() => {
      setMessages((prev) => [...prev, botMessage]);
    }, 400);

    inputRef.current?.focus();
  }

  return (
    <main className="layout">
      <aside className="sidebar">
        <div className="brand">RoboChat</div>
        <input className="search" placeholder="Поиск" />

        <div className="chat-list">
          {contacts.map((contact) => {
            const isActive = activeContact.id === contact.id;
            return (
              <button
                key={contact.id}
                className={`chat-item ${isActive ? "active" : ""}`}
                onClick={() => setActiveContact(contact)}
              >
                <div className="chat-avatar">{contact.name[0]}</div>
                <div>
                  <p className="chat-name">{contact.name}</p>
                  <p className="chat-status">{contact.status}</p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="chat-view">
        <header className="chat-header">
          <h1>{title}</h1>
          <span>{activeContact.status}</span>
        </header>

        <div className="messages">
          {messages.map((message) => (
            <div key={message.id} className={`bubble-row ${message.author === "me" ? "me" : "bot"}`}>
              <div className={`bubble ${message.author === "me" ? "me" : "bot"}`}>
                <p>{message.text}</p>
                <span>{message.time}</span>
              </div>
            </div>
          ))}
        </div>

        <form className="composer" onSubmit={sendMessage}>
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Напишите сообщение..."
          />
          <button type="submit">Отправить</button>
        </form>
      </section>
    </main>
  );
}
