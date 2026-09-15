import { NextRequest, NextResponse } from "next/server";
import { chatWithCommit } from "@/lib/AI Summarizer";
import { getGithubTokenForRepo, fetchCommitDiff } from "@/lib/github";

export async function POST(req: NextRequest) {
  try {
    const { diffUrl, repoUrl, sha, userMessage, history } = await req.json();

    if (!diffUrl || !repoUrl || !sha || !userMessage) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    let diffText = "";
    try {
      const token = await getGithubTokenForRepo(repoUrl);
      diffText = await fetchCommitDiff(repoUrl, sha, token);
    } catch (e) {
      console.warn("API diff fetch failed, trying direct diffUrl fetch", e);
      const diffResponse = await fetch(diffUrl);
      if (!diffResponse.ok) throw new Error("Failed to fetch diff");
      diffText = await diffResponse.text();
    }
    
    const answer = await chatWithCommit(diffText, userMessage, history || []);
    return NextResponse.json({ answer }, { status: 200 });

  } catch (error: any) {
    console.error("Chat Error:", error);
    return NextResponse.json({ error: "Failed to answer." }, { status: 500 });
  }
}
