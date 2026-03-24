import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { initDB, sanitizeRoomId } from "@/lib/db";

type DBMessage = {
  id: string;
  room_id: string;
  author: string;
  text: string;
  created_at: string;
};

export async function GET(request: NextRequest) {
  try {
    await initDB();

    const roomId = sanitizeRoomId(request.nextUrl.searchParams.get("room") ?? "general");
    const after = request.nextUrl.searchParams.get("after");

    const rows = after
      ? (
          await sql<DBMessage>`
            SELECT id, room_id, author, text, created_at
            FROM messages
            WHERE room_id = ${roomId}
              AND created_at > TO_TIMESTAMP(${Number(after)} / 1000.0)
            ORDER BY created_at ASC
            LIMIT 100;
          `
        ).rows
      : (
          await sql<DBMessage>`
            SELECT id, room_id, author, text, created_at
            FROM messages
            WHERE room_id = ${roomId}
            ORDER BY created_at DESC
            LIMIT 100;
          `
        ).rows.reverse();

    const messages = rows.map((row) => ({
      id: row.id,
      roomId: row.room_id,
      author: row.author,
      text: row.text,
      createdAt: new Date(row.created_at).getTime()
    }));

    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ error: "Ошибка подключения к базе данных." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDB();

    const body = (await request.json()) as {
      room?: string;
      author?: string;
      text?: string;
    };

    const roomId = sanitizeRoomId(body.room ?? "general");
    const author = (body.author ?? "").trim().slice(0, 30);
    const text = (body.text ?? "").trim().slice(0, 2000);

    if (!author) {
      return NextResponse.json({ error: "Введите имя пользователя." }, { status: 400 });
    }

    if (!text) {
      return NextResponse.json({ error: "Сообщение пустое." }, { status: 400 });
    }

    const result = await sql<DBMessage>`
      INSERT INTO messages (room_id, author, text)
      VALUES (${roomId}, ${author}, ${text})
      RETURNING id, room_id, author, text, created_at;
    `;

    const row = result.rows[0];

    return NextResponse.json(
      {
        message: {
          id: row.id,
          roomId: row.room_id,
          author: row.author,
          text: row.text,
          createdAt: new Date(row.created_at).getTime()
        }
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Не удалось сохранить сообщение в БД." }, { status: 500 });
  }
}
