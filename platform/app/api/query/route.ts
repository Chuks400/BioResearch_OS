import { NextRequest, NextResponse } from "next/server";
import { callGradioBackend, parseGradioResponse } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, settings } = body as {
      query: string;
      settings: {
        backend: string;
        answerMode: string;
        topK: number;
        indexPath: string;
      };
    };

    if (!query?.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const gradioData = await callGradioBackend(query, settings);
    const result     = parseGradioResponse(gradioData as { data: unknown[] }, query);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[query route]", msg);

    if (msg.includes("ECONNREFUSED") || msg.includes("fetch failed")) {
      return NextResponse.json(
        { error: "Backend offline. Start the Gradio server with: python -m demo.app" },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
