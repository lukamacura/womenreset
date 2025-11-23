import { NextResponse } from "next/server";

export const runtime = "nodejs";

const PIPELINE_ID = process.env.VECTORSHIFT_USERS_PIPELINE_ID!;
const VECTORSHIFT_API_KEY = process.env.VECTORSHIFT_API_KEY!; 
// this is the "Bearer JWT" from Vectorshift

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!PIPELINE_ID || !VECTORSHIFT_API_KEY) {
      return NextResponse.json(
        { error: "Missing Vectorshift env vars." },
        { status: 500 }
      );
    }

    // Send everything as ONE JSON string into memory
    const payload = {
      inputs: {
        memory: JSON.stringify(body),
      },
    };

    const vsRes = await fetch(
      `https://api.vectorshift.ai/v1/pipeline/${PIPELINE_ID}/run`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${VECTORSHIFT_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await vsRes.json().catch(() => ({}));

    if (!vsRes.ok) {
      return NextResponse.json(
        { error: data?.error || "Vectorshift request failed", details: data },
        { status: vsRes.status }
      );
    }

    return NextResponse.json({ ok: true, vectorshift: data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
