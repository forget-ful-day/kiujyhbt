import { NextRequest, NextResponse } from "next/server";
import { addMessage, getMessages } from "@/lib/file-db";

export async function GET(request: NextRequest) {
  const room = request.nextUrl.searchParams.get("room") ?? "general";
  const afterRaw = request.nextUrl.searchParams.get("after");
  const after = afterRaw ? Number(afterRaw) : undefined;

  const messages = await getMessages(room, Number.isNaN(after) ? undefined : after);
  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      room?: string;
      author?: string;
      text?: string;
    };

    const message = await addMessage(body.room ?? "general", {
      author: body.author ?? "",
      text: body.text ?? ""
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка записи сообщения";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
