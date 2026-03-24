import { sql } from "@vercel/postgres";

let initialized = false;

export async function initDB() {
  if (initialized) {
    return;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      room_id VARCHAR(32) NOT NULL,
      author VARCHAR(30) NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_messages_room_created_at ON messages(room_id, created_at);`;
  initialized = true;
}

export function sanitizeRoomId(roomId: string) {
  const normalized = roomId.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);
  return normalized || "general";
}
