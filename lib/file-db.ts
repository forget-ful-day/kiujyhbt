import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredMessage = {
  id: string;
  author: string;
  text: string;
  createdAt: number;
};

type DBShape = {
  rooms: Record<string, StoredMessage[]>;
};

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "messages.json");

let writeQueue: Promise<void> = Promise.resolve();

function normalizeRoomId(roomId: string) {
  const normalized = roomId.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);
  return normalized || "general";
}

async function ensureFile() {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(dbPath, "utf8");
  } catch {
    await writeFile(dbPath, JSON.stringify({ rooms: {} }, null, 2), "utf8");
  }
}

async function readDB(): Promise<DBShape> {
  await ensureFile();
  const raw = await readFile(dbPath, "utf8");
  try {
    const parsed = JSON.parse(raw) as DBShape;
    return parsed?.rooms ? parsed : { rooms: {} };
  } catch {
    return { rooms: {} };
  }
}

async function writeDB(data: DBShape) {
  await ensureFile();
  await writeFile(dbPath, JSON.stringify(data, null, 2), "utf8");
}

export async function getMessages(roomId: string, after?: number) {
  const room = normalizeRoomId(roomId);
  const db = await readDB();
  const messages = db.rooms[room] ?? [];

  if (!after) {
    return messages.slice(-100);
  }

  return messages.filter((message) => message.createdAt > after).slice(-100);
}

export async function addMessage(roomId: string, message: Omit<StoredMessage, "id" | "createdAt">) {
  const room = normalizeRoomId(roomId);

  const cleanAuthor = message.author.trim().slice(0, 30);
  const cleanText = message.text.trim().slice(0, 2000);

  if (!cleanAuthor) {
    throw new Error("Имя пользователя пустое");
  }

  if (!cleanText) {
    throw new Error("Сообщение пустое");
  }

  const payload: StoredMessage = {
    id: crypto.randomUUID(),
    author: cleanAuthor,
    text: cleanText,
    createdAt: Date.now()
  };

  writeQueue = writeQueue.then(async () => {
    const db = await readDB();
    const roomMessages = db.rooms[room] ?? [];
    db.rooms[room] = [...roomMessages, payload].slice(-300);
    await writeDB(db);
  });

  await writeQueue;
  return payload;
}
