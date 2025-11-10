/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { userInput, memoryContext, history } = (await req.json()) as {
      userInput?: string;
      memoryContext?: string;
      history?: string;
    };

    if (!userInput?.trim()) {
      return NextResponse.json({ error: "Missing userInput" }, { status: 400 });
    }

    const apiKey =
      process.env.VECTORSHIFT_API_KEY ||
      (process.env as any).vectorshift_api_key ||
      "";
    const pipelineId =
      process.env.VECTORSHIFT_PIPELINE_ID ||
      (process.env as any).vectorshift_pipeline_id ||
      "";

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing VECTORSHIFT_API_KEY" },
        { status: 500 }
      );
    }
    if (!pipelineId) {
      return NextResponse.json(
        { error: "Missing VECTORSHIFT_PIPELINE_ID" },
        { status: 500 }
      );
    }

    const url = `https://api.vectorshift.ai/v1/pipeline/${encodeURIComponent(
      pipelineId
    )}/run`;

    const inputs = {
      user_input: userInput,
      memory_context: memoryContext ?? "No prior user profile saved.",
      history: history ?? "",
    };

    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs }),
      cache: "no-store",
    });

    const raw = await r.text();
    let data: any = null;
    try {
      data = JSON.parse(raw);
    } catch {}

    if (!r.ok) {
      const msg = data?.error || data?.message || raw || r.statusText;
      return NextResponse.json(
        { error: `Vectorshift error: ${msg}` },
        { status: 500 }
      );
    }

    const reply =
      data?.outputs?.output_0 ??
      data?.outputs?.output ??
      data?.outputs?.answer ??
      (data?.outputs
        ? (Object.values(data.outputs).find(
            (v: any) => typeof v === "string"
          ) as string)
        : null) ??
      "⚠️ No reply.";

    return NextResponse.json({ reply: String(reply) });
  } catch (e: any) {
    return NextResponse.json(
      { error: `Internal error: ${e?.message ?? "unknown"}` },
      { status: 500 }
    );
  }
}
