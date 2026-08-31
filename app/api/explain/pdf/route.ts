import { NextRequest, NextResponse } from "next/server";
import { generateDetailedExplanation } from "@/lib/AI Summarizer";
import { generateCommitPDF } from "@/lib/PDF Generator";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const diffUrl = searchParams.get("diffUrl");
  const repoUrl = searchParams.get("repoUrl") || "Unknown Repo";
  const sha = searchParams.get("sha") || "Unknown SHA";

  if (!diffUrl) {
    return NextResponse.json({ error: "Missing diffUrl" }, { status: 400 });
  }

  try {
    const diffResponse = await fetch(diffUrl);
    if (!diffResponse.ok) throw new Error("Failed to fetch diff");
    
    const diffText = await diffResponse.text();
    if (!diffText.trim()) {
      return NextResponse.json({ error: "Empty commit." }, { status: 400 });
    }

    const detailedExplanation = await generateDetailedExplanation(diffText);
    
    const pdfBuffer = generateCommitPDF({
      repoUrl,
      sha,
      detailedExplanation
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Commit-${sha}.pdf"`,
      }
    });

  } catch (error: any) {
    console.error("PDF Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate PDF." }, { status: 500 });
  }
}
