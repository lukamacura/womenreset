import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { question } = await req.json();
    const url = process.env.BACKEND_URL; // npr. https://womenreset-api.onrender.com
    if (!url) return NextResponse.json({ answer: "Missing BACKEND_URL" }, { status: 500 });

    const r = await fetch(`${url}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    if (!r.ok) {
      const t = await r.text();
      return NextResponse.json({ answer: `Upstream error: ${t}` }, { status: r.status });
    }

    const { answer } = await r.json();
    return NextResponse.json({ answer });
 } catch (e) {
  console.error(e); // iskoristi 'e'
  return NextResponse.json({ answer: "Server error. Please try again." }, { status: 500 });
}

}

export async function GET() {
  // health proxy (opciono)
  const url = process.env.BACKEND_URL;
  try {
    const r = await fetch(`${url}/health`);
    const j = await r.json();
    return NextResponse.json(j);
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
