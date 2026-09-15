import { NextRequest, NextResponse } from "next/server";
import { generateBriefSummary } from "@/lib/AI Summarizer";
import { getGithubTokenForRepo, fetchCommitDiff } from "@/lib/github";

export async function POST(req: NextRequest) {
  try {
    const { diffUrl, repoUrl, sha } = await req.json();

    if (!diffUrl || !repoUrl || !sha) {
      return NextResponse.json({ error: "Missing diffUrl, repoUrl, or sha" }, { status: 400 });
    }

    let diffText = "";
    try {
      const token = await getGithubTokenForRepo(repoUrl);
      diffText = await fetchCommitDiff(repoUrl, sha, token);
    } catch (e) {
      // Fallback to directly fetching diffUrl (for public repos if rate limited on API)
      console.warn("API diff fetch failed, trying direct diffUrl fetch", e);
      const diffResponse = await fetch(diffUrl);
      if (!diffResponse.ok) throw new Error("Failed to fetch diff");
      diffText = await diffResponse.text();
    }
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
