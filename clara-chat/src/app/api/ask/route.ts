import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { question } = await req.json();
    const url =
      process.env.BACKEND_URL ??
      process.env.NEXT_PUBLIC_BACKEND_URL ??
      "http://localhost:8000";

    if (!url) {
      return NextResponse.json({ answer: "Missing BACKEND_URL" }, { status: 500 });
    }

    const r = await fetch(`${url}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ answer: "Server error. Please try again." }, { status: 500 });
  }
}

export async function GET() {
  const url =
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    "http://localhost:8000";

  try {
    const r = await fetch(`${url}/health`);
    return NextResponse.json(await r.json(), { status: r.status });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
