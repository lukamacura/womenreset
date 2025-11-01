/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/vectorshift/route.ts
export async function POST(req: Request) {
  try {
    const { userInput } = (await req.json()) as { userInput: string };

    if (!userInput?.trim()) {
      return new Response("Missing userInput", { status: 400 });
    }

    const apiKey = process.env.VECTORSHIFT_API_KEY!;
    const pipelineId = process.env.VECTORSHIFT_PIPELINE_ID!;
    const url = `https://api.vectorshift.ai/v1/pipeline/${pipelineId}/run`;

    // Najjednostavniji, zvanični oblik payload-a: "inputs" kao mapa
    const body = JSON.stringify({
      inputs: {
        // promeni "user_input" ako se tvoj ulaz zove drugačije
        user_input: userInput,
      },
    });

    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body,
    });

    if (!r.ok) {
      const text = await r.text();
      return new Response(`Vectorshift error: ${text}`, { status: 500 });
    }

    // Očekivan odgovor: { status:"success", run_id:"...", outputs:{ ... } }
    const data = await r.json();
    // Podesi ključ izlaza po svom pipeline-u; često se zove "output"
    const reply =
      data?.outputs?.output ??
      data?.outputs?.answer ??
      JSON.stringify(data?.outputs ?? {}, null, 2);

    return Response.json({ reply });
  } catch (e: any) {
    return new Response(`Internal error: ${e?.message ?? "unknown"}`, {
      status: 500,
    });
  }
}
