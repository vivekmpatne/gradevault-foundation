import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AcademicData } from "@/lib/academic-store";
import type { StudentSettings } from "@/lib/settings-store";

// Brand colors (RGB)
const BRAND = {
  primary: [15, 23, 42] as [number, number, number], // slate-900
  accent: [37, 99, 235] as [number, number, number], // blue-600
  good: [16, 185, 129] as [number, number, number], // emerald-500
  warn: [245, 158, 11] as [number, number, number], // amber-500
  bad: [239, 68, 68] as [number, number, number], // red-500
  muted: [100, 116, 139] as [number, number, number], // slate-500
  light: [241, 245, 249] as [number, number, number], // slate-100
};

function prepTrackLabel(t: string) {
  if (t === "on-campus") return "On-Campus Placement";
  if (t === "off-campus") return "Off-Campus Placement";
  if (t === "higher-studies") return "Higher Studies";
  return t;
}

function computeReadiness(academic: AcademicData, s: StudentSettings) {
  const cgpa = Math.min(40, (academic.cgpa / 10) * 40);
  const lc = Math.min(20, (s.leetcode / 2000) * 20);
  const cf = Math.min(15, (s.codeforces / 1800) * 15);
  const proj = Math.min(25, (s.projects / 5) * 25);
  const total = Math.round(cgpa + lc + cf + proj);
  const tier =
    total >= 80
      ? "Interview Ready"
      : total >= 60
        ? "Competitive"
        : total >= 35
          ? "Developing"
          : "Beginner";
  return { cgpa, lc, cf, proj, total, tier };
}

function placementVerdict(academic: AcademicData, s: StudentSettings) {
  const ready =
    academic.cgpa >= 7 && s.projects >= 2 && s.leetcode >= 1200;
  return ready
    ? "Meets baseline placement criteria"
    : "Improve CGPA >= 7, projects >= 2, LeetCode >= 1200";
}

export function exportDashboardPdf(
  academic: AcademicData,
  settings: StudentSettings,
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = 0;

  // ===== Header / Branding band =====
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, pageW, 90, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("GradeVault", margin, 42);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text("Your Academic Blueprint", margin, 62);

  const generated = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  doc.setFontSize(9);
  doc.text(`Generated: ${generated}`, pageW - margin, 62, { align: "right" });

  y = 110;

  // ===== Student details =====
  doc.setTextColor(...BRAND.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Student Details", margin, y);
  y += 6;
  doc.setDrawColor(...BRAND.accent);
  doc.setLineWidth(1.5);
  doc.line(margin, y, margin + 80, y);
  y += 16;

  const student = academic.student?.profile;
  autoTable(doc, {
    startY: y,
    theme: "plain",
    margin: { left: margin, right: margin },
    styles: { fontSize: 10, cellPadding: { top: 4, bottom: 4, left: 0, right: 8 } },
    body: [
      ["Name", student?.name ?? "—"],
      ["USN", student?.usn ?? "—"],
      ["Branch", student?.branch ?? "—"],
      ["Current Semester", `Semester ${academic.currentSemester}`],
      ["Semesters Completed", String(academic.completedSemesters)],
    ],
    columnStyles: {
      0: { fontStyle: "bold", textColor: BRAND.muted, cellWidth: 140 },
      1: { textColor: BRAND.primary },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 20;

  // ===== Key Stat Cards =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BRAND.primary);
  doc.text("Performance Summary", margin, y);
  y += 6;
  doc.setDrawColor(...BRAND.accent);
  doc.line(margin, y, margin + 110, y);
  y += 14;

  const cards = [
    { label: "Current CGPA", value: academic.hasData ? academic.cgpa.toFixed(2) : "—" },
    { label: "Latest SGPA", value: academic.hasData ? academic.latestSgpa.toFixed(2) : "—" },
    { label: "Target CGPA", value: settings.targetCGPA.toFixed(2) },
    { label: "Equivalent %", value: academic.hasData ? `${academic.percentage.toFixed(2)}%` : "—" },
  ];
  const cardW = (pageW - margin * 2 - 12 * 3) / 4;
  const cardH = 60;
  cards.forEach((c, i) => {
    const x = margin + i * (cardW + 12);
    doc.setFillColor(...BRAND.light);
    doc.roundedRect(x, y, cardW, cardH, 6, 6, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.muted);
    doc.text(c.label, x + 10, y + 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...BRAND.primary);
    doc.text(c.value, x + 10, y + 44);
  });
  y += cardH + 24;

  // ===== SGPA History =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BRAND.primary);
  doc.text("SGPA History", margin, y);
  y += 6;
  doc.setDrawColor(...BRAND.accent);
  doc.line(margin, y, margin + 90, y);
  y += 14;

  const completed = academic.semesters.filter((s) => s.completed);
  if (completed.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.muted);
    doc.text("No completed semesters yet.", margin, y);
    y += 20;
  } else {
    autoTable(doc, {
      startY: y,
      head: [["Semester", "SGPA", "Credits", "Status"]],
      body: completed.map((s, i) => {
        const prev = i > 0 ? completed[i - 1] : null;
        let trend = "—";
        if (prev) {
          const d = s.sgpa - prev.sgpa;
          trend = d > 0.1 ? `Up +${d.toFixed(2)}` : d < -0.1 ? `Down ${d.toFixed(2)}` : "Stable";
        }
        return [`Sem ${s.number}`, s.sgpa.toFixed(2), String(s.credits), trend];
      }),
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: BRAND.primary,
        textColor: 255,
        fontSize: 10,
      },
      styles: { fontSize: 10, cellPadding: 6 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  // ===== Semester table (subjects) =====
  if (completed.length > 0) {
    if (y > pageH - 180) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...BRAND.primary);
    doc.text("Semester Breakdown", margin, y);
    y += 6;
    doc.setDrawColor(...BRAND.accent);
    doc.line(margin, y, margin + 130, y);
    y += 14;

    completed.forEach((sem) => {
      if (y > pageH - 120) {
        doc.addPage();
        y = margin;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...BRAND.primary);
      doc.text(
        `Semester ${sem.number}  -  SGPA ${sem.sgpa.toFixed(2)}  -  ${sem.credits} credits`,
        margin,
        y,
      );
      y += 8;
      autoTable(doc, {
        startY: y,
        head: [["Subject", "Credits", "Marks"]],
        body: sem.subjects.map((s) => [
          s.name || "—",
          String(s.credits ?? "—"),
          String(s.marks ?? "—"),
        ]),
        margin: { left: margin, right: margin },
        headStyles: {
          fillColor: BRAND.accent,
          textColor: 255,
          fontSize: 9,
        },
        styles: { fontSize: 9, cellPadding: 4 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });
      y = (doc as any).lastAutoTable.finalY + 14;
    });
  }

  // ===== Career Readiness =====
  if (y > pageH - 200) {
    doc.addPage();
    y = margin;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BRAND.primary);
  doc.text("Career Readiness", margin, y);
  y += 6;
  doc.setDrawColor(...BRAND.accent);
  doc.line(margin, y, margin + 120, y);
  y += 14;

  const r = computeReadiness(academic, settings);
  autoTable(doc, {
    startY: y,
    head: [["Metric", "Score", "Max"]],
    body: [
      ["CGPA Score", r.cgpa.toFixed(0), "40"],
      ["LeetCode Score", r.lc.toFixed(0), "20"],
      ["Codeforces Score", r.cf.toFixed(0), "15"],
      ["Projects Score", r.proj.toFixed(0), "25"],
      [
        { content: "Total Readiness", styles: { fontStyle: "bold" } },
        { content: `${r.total}%`, styles: { fontStyle: "bold" } },
        { content: "100", styles: { fontStyle: "bold" } },
      ],
    ],
    margin: { left: margin, right: margin },
    headStyles: { fillColor: BRAND.primary, textColor: 255, fontSize: 10 },
    styles: { fontSize: 10, cellPadding: 6 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  const tierColor: [number, number, number] =
    r.total >= 60 ? BRAND.good : r.total >= 35 ? BRAND.warn : BRAND.bad;
  doc.setFillColor(...tierColor);
  doc.roundedRect(margin, y, 140, 22, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Tier: ${r.tier}`, margin + 10, y + 15);
  y += 36;

  // ===== Placement Readiness =====
  if (y > pageH - 140) {
    doc.addPage();
    y = margin;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BRAND.primary);
  doc.text("Placement Readiness", margin, y);
  y += 6;
  doc.setDrawColor(...BRAND.accent);
  doc.line(margin, y, margin + 140, y);
  y += 14;

  autoTable(doc, {
    startY: y,
    theme: "plain",
    margin: { left: margin, right: margin },
    styles: { fontSize: 10, cellPadding: { top: 4, bottom: 4, left: 0, right: 8 } },
    body: [
      ["Prep Track", prepTrackLabel(settings.prepTrack)],
      ["Career Goal", settings.careerGoal || "—"],
      ["Target CGPA", settings.targetCGPA.toFixed(2)],
      ["Target Package", `${settings.targetLPA} LPA`],
      ["LeetCode Rating", String(settings.leetcode || 0)],
      ["Codeforces Rating", String(settings.codeforces || 0)],
      ["Projects", String(settings.projects || 0)],
      ["Status", placementVerdict(academic, settings)],
    ],
    columnStyles: {
      0: { fontStyle: "bold", textColor: BRAND.muted, cellWidth: 140 },
      1: { textColor: BRAND.primary },
    },
  });

  // ===== Footer on every page =====
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(...BRAND.light);
    doc.setLineWidth(0.5);
    doc.line(margin, pageH - 30, pageW - margin, pageH - 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.muted);
    doc.text("GradeVault — Your Academic Blueprint", margin, pageH - 16);
    doc.text(`Page ${p} of ${pageCount}`, pageW - margin, pageH - 16, {
      align: "right",
    });
  }

  const usn = student?.usn || "student";
  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`GradeVault_${usn}_${stamp}.pdf`);
}
