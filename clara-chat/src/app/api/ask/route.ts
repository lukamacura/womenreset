import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const url = process.env.FASTAPI_ASK_URL!;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    return NextResponse.json({ answer: "Server is busy. Try again in a moment." }, { status: 200 });
  }
  const data = await r.json();
  return NextResponse.json(data);
}
