import { NextRequest, NextResponse } from "next/server";
import { chatWithCommit } from "@/lib/AI Summarizer";

export async function POST(req: NextRequest) {
  try {
    const { diffUrl, userMessage, history } = await req.json();

    if (!diffUrl || !userMessage) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const diffResponse = await fetch(diffUrl);
    if (!diffResponse.ok) throw new Error("Failed to fetch diff");
    
    const diffText = await diffResponse.text();
    
    const answer = await chatWithCommit(diffText, userMessage, history || []);
    return NextResponse.json({ answer }, { status: 200 });

  } catch (error: any) {
    console.error("Chat Error:", error);
    return NextResponse.json({ error: "Failed to answer." }, { status: 500 });
  }
}
