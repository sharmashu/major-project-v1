import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const repoUrl = searchParams.get("repo");

  if (!repoUrl || !repoUrl.includes("github.com/")) {
    return NextResponse.json({ error: "Invalid GitHub repository URL." }, { status: 400 });
  }

  try {
    const urlObj = new URL(repoUrl);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    
    if (pathParts.length < 2) {
      return NextResponse.json({ error: "Invalid repository format. Should be github.com/owner/repo" }, { status: 400 });
    }

    const owner = pathParts[0];
    const repo = pathParts[1];

    // Fetch the last 15 commits to avoid massive payloads
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=15`;
    
    const response = await fetch(apiUrl, {
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "GitSimple-App"
      }
    });

    if (!response.ok) {
      if (response.status === 404) return NextResponse.json({ error: "Repository not found or is private." }, { status: 404 });
      if (response.status === 403) return NextResponse.json({ error: "GitHub API rate limit exceeded." }, { status: 403 });
      throw new Error(`GitHub API returned ${response.status}`);
    }

    const commitsData = await response.json();

    const commits = commitsData.map((c: any) => ({
      sha: c.sha,
      shortSha: c.sha.substring(0, 7),
      message: c.commit.message,
      author: c.commit.author.name,
      date: c.commit.author.date,
      url: c.html_url,
      diffUrl: `${c.html_url}.diff`
    }));

    return NextResponse.json({ commits }, { status: 200 });

  } catch (error: any) {
    console.error("Fetch Commits Error:", error);
    return NextResponse.json({ error: "Failed to fetch commits." }, { status: 500 });
  }
}
