import { jsPDF } from "jspdf";

export interface PDFReportData {
  repoUrl: string;
  sha: string;
  detailedExplanation: string;
}

export function generateCommitPDF(data: PDFReportData): ArrayBuffer {
  const doc = new jsPDF();
  let y = 20;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text("Commit Explanation Report", 20, y);
  y += 12;

  // Metadata
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(`Repository: ${data.repoUrl}`, 20, y);
  y += 6;
  doc.text(`Commit SHA: ${data.sha}`, 20, y);
  y += 6;
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, y);
  y += 15;

  // Line separator
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.line(20, y, 190, y);
  y += 15;

  // Detailed Explanation
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text("Detailed Breakdown", 20, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(51, 65, 85); // Slate-700
  
  // Split explanation into lines to fit page width
  const lines = doc.splitTextToSize(data.detailedExplanation, 170);
  
  for (let i = 0; i < lines.length; i++) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(lines[i], 20, y);
    y += 7; // Line height
  }

  y += 15;

  // Footer
  if (y > 270) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text("Generated automatically by GitSimple AI", 20, 280);

  return doc.output('arraybuffer');
}
