"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";

export default function DoctorReportButton() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch("/api/doctor-report?days=30");
      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const { report } = await response.json();

      // Create a simple text-based report (can be enhanced with PDF generation later)
      const reportText = `
DOCTOR REPORT - SYMPTOM TRACKER
Generated: ${new Date().toLocaleDateString()}

Patient: ${report.patientName}
Date Range: ${report.dateRange.start} to ${report.dateRange.end}

SUMMARY
Total Symptoms Logged: ${report.summary.totalSymptoms}
Average Severity: ${report.summary.averageSeverity}/3

Most Frequent Symptoms:
${report.summary.mostFrequentSymptoms
  .map(
    (s: any) =>
      `  • ${s.name}: ${s.count} occurrences, avg severity ${s.avgSeverity}/3 (${s.trend})`
  )
  .join("\n")}

PATTERNS DETECTED
${report.patterns.map((p: string) => `  • ${p}`).join("\n")}

QUESTIONS TO ASK YOUR DOCTOR
${report.questions.map((q: string, i: number) => `  ${i + 1}. ${q}`).join("\n")}
      `.trim();

      // Create and download file
      const blob = new Blob([reportText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `doctor-report-${new Date().toISOString().split("T")[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleGenerateReport}
        disabled={isGenerating}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#D4A5A5] hover:bg-[#C49494] text-white font-semibold rounded-xl transition-colors shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <>
            <FileText className="h-5 w-5 animate-pulse" />
            Generating...
          </>
        ) : (
          <>
            <Download className="h-5 w-5" />
            Generate Doctor Report
          </>
        )}
      </button>
      {error && (
        <p className="mt-2 text-sm text-[#D4A5A5]">{error}</p>
      )}
    </div>
  );
}

