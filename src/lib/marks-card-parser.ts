/**
 * Marks Card Parser.
 *
 * Heuristic, client-side extractor for VTU-style marks card PDFs and result
 * screenshots. Works on plain text extracted with pdf.js. Image OCR is wired
 * in via a pluggable `OcrFn` so a future cloud OCR provider can drop in
 * without touching callers.
 */

import type { CalcSubject } from "@/lib/calculator-storage";

export type ExtractedSubject = {
  code: string;
  name: string;
  credits: number;
  marks: number;
};

export type ExtractedMarksCard = {
  studentName: string;
  usn: string;
  semester: number;
  subjects: ExtractedSubject[];
  confidence: number; // 0..100
  rawText: string;
  notes: string[];
};

export type OcrFn = (file: File) => Promise<string>;

const ROMAN: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8,
};

function detectSemester(text: string): number {
  // "Semester: 5", "V Semester", "SEM-5", "5th Semester"
  const patterns: RegExp[] = [
    /sem(?:ester)?\s*[:\-]?\s*(\d{1,2})/i,
    /(\d{1,2})(?:st|nd|rd|th)\s*sem(?:ester)?/i,
    /\b(I|II|III|IV|V|VI|VII|VIII)\b\s*sem(?:ester)?/i,
    /sem(?:ester)?\s*[:\-]?\s*(I|II|III|IV|V|VI|VII|VIII)\b/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (!m) continue;
    const v = m[1];
    if (/^\d+$/.test(v)) {
      const n = parseInt(v, 10);
      if (n >= 1 && n <= 8) return n;
    }
    const r = ROMAN[v.toUpperCase()];
    if (r) return r;
  }
  return 0;
}

function detectUsn(text: string): string {
  // VTU USN: 1XX99XX999 e.g. 1RV21CS052, 4JK20IS001
  const m = text.match(/\b[1-9][A-Z]{2}\d{2}[A-Z]{2}\d{3}\b/);
  return m ? m[0].toUpperCase() : "";
}

function detectName(text: string): string {
  // Look for "Name : Foo Bar"
  const m =
    text.match(/(?:Student\s*)?Name\s*[:\-]\s*([A-Z][A-Z .'-]{2,60})/i) ??
    text.match(/Name\s+of\s+(?:the\s+)?Student\s*[:\-]\s*([A-Z][A-Z .'-]{2,60})/i);
  if (!m) return "";
  return m[1].replace(/\s+/g, " ").trim();
}

/**
 * Per-line heuristic for one row of subjects.
 * Acceptable shapes (case-insensitive, whitespace tolerant):
 *   21CS51  Software Engineering            3   78
 *   18MAT41 Complex Analysis & PDE          4   85
 *   BCS501  OS                              4   72   AB
 * We accept the LAST integer in 1..100 range as marks and the trailing-but-
 * before-marks small int (1..6) as credits when present.
 */
const SUBJECT_CODE_RE = /\b([0-9]{2}[A-Z]{2,4}[0-9]{1,3}[A-Z]?|B[A-Z]{2,4}[0-9]{2,3}[A-Z]?)\b/;

function parseSubjectLine(line: string): ExtractedSubject | null {
  const codeMatch = line.match(SUBJECT_CODE_RE);
  if (!codeMatch) return null;
  const code = codeMatch[1].toUpperCase();
  const afterCode = line.slice(codeMatch.index! + code.length).trim();
  if (!afterCode) return null;

  // Pull out all integers in the tail with positions.
  const nums = [...afterCode.matchAll(/\b(\d{1,3})\b/g)].map((m) => ({
    val: parseInt(m[1], 10),
    idx: m.index!,
  }));
  if (nums.length === 0) return null;

  // Marks: last number in 0..100.
  const markCandidates = nums.filter((n) => n.val >= 0 && n.val <= 100);
  if (markCandidates.length === 0) return null;
  const marksTok = markCandidates[markCandidates.length - 1];

  // Credits: an int 1..6 appearing BEFORE marks token.
  const credCandidates = nums.filter(
    (n) => n.idx < marksTok.idx && n.val >= 1 && n.val <= 6,
  );
  const credTok = credCandidates[credCandidates.length - 1];
  const credits = credTok?.val ?? 0;

  // Name = text between code and the first numeric token in the tail.
  const firstNumIdx = nums[0].idx;
  const name = afterCode.slice(0, firstNumIdx).replace(/[|:;]+/g, " ").trim();
  if (name.length < 2) return null;

  return {
    code,
    name: name.replace(/\s+/g, " ").slice(0, 80),
    credits,
    marks: marksTok.val,
  };
}

function extractSubjects(text: string): ExtractedSubject[] {
  const seen = new Map<string, ExtractedSubject>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.length < 8) continue;
    const sub = parseSubjectLine(line);
    if (!sub) continue;
    // Prefer the entry with non-zero credits if duplicates appear.
    const prev = seen.get(sub.code);
    if (!prev || (prev.credits === 0 && sub.credits > 0)) {
      seen.set(sub.code, sub);
    }
  }
  return [...seen.values()];
}

function computeConfidence(r: {
  studentName: string;
  usn: string;
  semester: number;
  subjects: ExtractedSubject[];
}): number {
  let score = 0;
  if (r.usn) score += 20;
  if (r.studentName) score += 15;
  if (r.semester) score += 15;
  if (r.subjects.length >= 4) score += 30;
  else if (r.subjects.length > 0) score += 15;
  const withCredits = r.subjects.filter((s) => s.credits > 0).length;
  if (r.subjects.length > 0) {
    score += Math.round((withCredits / r.subjects.length) * 20);
  }
  return Math.max(0, Math.min(100, score));
}

export function parseMarksCardText(text: string): ExtractedMarksCard {
  const usn = detectUsn(text);
  const studentName = detectName(text);
  const semester = detectSemester(text);
  const subjects = extractSubjects(text);
  const notes: string[] = [];
  if (!usn) notes.push("USN could not be detected — please fill it in.");
  if (!semester) notes.push("Semester number could not be detected.");
  if (subjects.length === 0)
    notes.push("No subject rows recognised — try a clearer scan or enter manually.");
  if (subjects.some((s) => s.credits === 0))
    notes.push("Some credits are missing — verify before importing.");

  const confidence = computeConfidence({
    studentName,
    usn,
    semester,
    subjects,
  });
  return { studentName, usn, semester, subjects, confidence, rawText: text, notes };
}

/** Extract raw text from a PDF using pdf.js (browser-only). */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // Worker via Vite ?url import; pdf.js 6 ships an ESM worker bundle.
  const workerUrl = (
    await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
  ).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // pdf.js returns items with x positions — group by line via y coordinate.
    const lines = new Map<number, { x: number; str: string }[]>();
    for (const it of content.items as Array<{
      str: string;
      transform: number[];
    }>) {
      const y = Math.round(it.transform[5]);
      const x = it.transform[4];
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y)!.push({ x, str: it.str });
    }
    const ordered = [...lines.entries()].sort((a, b) => b[0] - a[0]);
    for (const [, parts] of ordered) {
      parts.sort((a, b) => a.x - b.x);
      text += parts.map((p) => p.str).join(" ") + "\n";
    }
    text += "\n";
  }
  return text;
}

/**
 * Future-ready image OCR hook. Today it returns an empty string so callers
 * can still show the preview + a manual fill-in flow. Wire a real OCR
 * provider here later (Tesseract.js, Google Vision, etc.) without changing
 * the caller surface.
 */
export const noopOcr: OcrFn = async () => "";

export async function parseFile(
  file: File,
  ocr: OcrFn = noopOcr,
): Promise<ExtractedMarksCard> {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    const text = await extractPdfText(file);
    return parseMarksCardText(text);
  }
  if (file.type.startsWith("image/")) {
    const text = await ocr(file);
    if (!text) {
      return {
        studentName: "",
        usn: "",
        semester: 0,
        subjects: [],
        confidence: 0,
        rawText: "",
        notes: [
          "Image OCR isn't enabled yet — fill in the table manually below.",
          "PDF uploads extract automatically.",
        ],
      };
    }
    return parseMarksCardText(text);
  }
  throw new Error("Unsupported file type. Upload a PDF, JPG, or PNG.");
}

/** Convert an extracted card into the app's CalcSubject shape. */
export function toCalcSubjects(subs: ExtractedSubject[]): CalcSubject[] {
  return subs.map((s, i) => ({
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `imp_${Date.now()}_${i}`,
    name: s.name || s.code,
    credits: s.credits || 3,
    marks: s.marks || 0,
  }));
}

/** Merge two subject lists by code — incoming overrides existing values. */
export function mergeSubjects(
  existing: CalcSubject[],
  incoming: CalcSubject[],
): CalcSubject[] {
  const byName = new Map<string, CalcSubject>();
  for (const s of existing) byName.set(s.name.toLowerCase(), s);
  for (const s of incoming) byName.set(s.name.toLowerCase(), s);
  return [...byName.values()];
}
