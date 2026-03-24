import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { initDB } from "@/lib/db";

type RoomRow = {
  room_id: string;
  last_message_at: string;
  last_text: string;
};

export async function GET() {
  try {
    await initDB();

    const rows = (
      await sql<RoomRow>`
        SELECT DISTINCT ON (m.room_id)
          m.room_id,
          m.created_at as last_message_at,
          m.text as last_text
        FROM messages m
        ORDER BY m.room_id, m.created_at DESC;
      `
    ).rows;

    const rooms = rows
      .map((row) => ({
        id: row.room_id,
        lastText: row.last_text,
        lastMessageAt: new Date(row.last_message_at).getTime()
      }))
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
      .slice(0, 20);

    return NextResponse.json({ rooms });
  } catch {
    return NextResponse.json({ rooms: [] });
  }
}
