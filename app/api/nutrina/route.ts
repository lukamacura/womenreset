/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/nutrina/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { userInput } = (await req.json()) as { userInput?: string };
    if (!userInput?.trim()) {
      return NextResponse.json({ error: "Missing userInput" }, { status: 400 });
    }

    // 🔑 env — primarno koristimo lowercase nutrition_pipeline_id
    const apiKey =
      process.env.VECTORSHIFT_API_KEY ||
      (process.env as any).vectorshift_api_key ||
      "";

    const pipelineId =
      (process.env as any).nutrition_pipeline_id || // <— primarno
      process.env.NUTRITION_PIPELINE_ID ||          // fallback UPPERCASE
      process.env.VECTORSHIFT_PIPELINE_ID ||        // još jedan fallback
      "";

    if (!apiKey) {
      return NextResponse.json({ error: "Missing VECTORSHIFT_API_KEY" }, { status: 500 });
    }
    if (!pipelineId) {
      return NextResponse.json({ error: "Missing nutrition_pipeline_id" }, { status: 500 });
    }

    const url = `https://api.vectorshift.ai/v1/pipeline/${encodeURIComponent(
      pipelineId
    )}/run`;

    // ⚠️ Ključ inputa mora da odgovara onom u pipeline-u; tipično je 'user_input'
    const body = JSON.stringify({
      inputs: { user_input: userInput },
    });

    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json", // JSON je OK
      },
      body,
      cache: "no-store",
    });

    const raw = await r.text();
    let data: any = null;
    try { data = JSON.parse(raw); } catch {}

    if (!r.ok) {
      const msg = data?.error || data?.message || raw || r.statusText;
      return NextResponse.json({ error: `Vectorshift error: ${msg}` }, { status: 500 });
    }

    // 🧾 Najčešći izlazi: output_0 (prema tvom screenshotu), output ili answer
    const reply =
      data?.outputs?.output_0 ??
      data?.outputs?.output ??
      data?.outputs?.answer ??
      (data?.outputs
        ? Object.values(data.outputs).find((v: any) => typeof v === "string")
        : null) ??
      JSON.stringify(data?.outputs ?? {}, null, 2);

    return NextResponse.json({ reply: String(reply) });
  } catch (e: any) {
    return NextResponse.json(
      { error: `Internal error: ${e?.message ?? "unknown"}` },
      { status: 500 }
    );
  }
}
