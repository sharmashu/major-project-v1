import { NextRequest, NextResponse } from "next/server";
import { generateBriefSummary } from "@/lib/AI Summarizer";

export async function POST(req: NextRequest) {
  try {
    const { diffUrl } = await req.json();

    if (!diffUrl) {
      return NextResponse.json({ error: "Missing diffUrl" }, { status: 400 });
    }

    const diffResponse = await fetch(diffUrl);
    if (!diffResponse.ok) throw new Error("Failed to fetch diff");
    
    const diffText = await diffResponse.text();
    if (!diffText.trim()) {
      return NextResponse.json({ summary: "This commit has no text changes." }, { status: 200 });
    }

    const summary = await generateBriefSummary(diffText);
    return NextResponse.json({ summary }, { status: 200 });

  } catch (error: any) {
    console.error("Brief Summary Error:", error);
    return NextResponse.json({ error: "Failed to generate summary." }, { status: 500 });
  }
}
