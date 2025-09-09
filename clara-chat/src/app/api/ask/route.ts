// clara-chat/src/app/api/ask/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { question } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ answer: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    // Minimalno: direktno zovemo OpenAI bez SDK-a (radi i na Vercelu i lokalno)
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: "You are Clara, empathetic and practical for women 40+." },
          { role: "user", content: question ?? "" },
        ],
      }),
    });

    if (!r.ok) {
      const txt = await r.text();
      // vrati upstream grešku da je vidiš u logu na Vercelu
      return NextResponse.json({ answer: `Upstream error: ${txt}` }, { status: 500 });
    }

    const data = await r.json();
    const answer =
      data?.choices?.[0]?.message?.content?.trim() ||
      "I’m here for you. Could you rephrase?";
    return NextResponse.json({ answer });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ answer: "Server error. Please try again." }, { status: 500 });
  }
}

// Healthcheck u browseru: otvori /api/ask i treba da vrati { ok: true }
export async function GET() {
  return NextResponse.json({ ok: true });
}

// (opciono) ako želiš edge runtime
// export const runtime = "edge";
