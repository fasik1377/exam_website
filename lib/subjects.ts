export type Stream = "natural" | "social";

export type Subject = {
  id?: string;
  name: string;
  amharic: string;
  streams: Stream[];
  /** Exam time allowed per question, in minutes. */
  minutes?: number;
  /** Hidden subjects stay in the database but are not offered to students or new teachers. */
  hidden?: boolean;
};

/**
 * Built-in subject list: seeds the database on first run and is the fallback while the live list
 * loads. The super admin manages the real list (add / rename / hide / delete) from the dashboard.
 */
export const SUBJECTS: Subject[] = [
  { name: "English", amharic: "እንግሊዝኛ", streams: ["natural", "social"] },
  { name: "Mathematics", amharic: "ሒሳብ", streams: ["natural", "social"], minutes: 3 },
  { name: "Scholastic Aptitude", amharic: "አፕቲቲዩድ", streams: ["natural", "social"] },
  { name: "Physics", amharic: "ፊዚክስ", streams: ["natural"] },
  { name: "Chemistry", amharic: "ኬሚስትሪ", streams: ["natural"] },
  { name: "Biology", amharic: "ባዮሎጂ", streams: ["natural"] },
  { name: "History", amharic: "ታሪክ", streams: ["social"] },
  { name: "Geography", amharic: "ጂኦግራፊ", streams: ["social"] },
  { name: "Economics", amharic: "ኢኮኖሚክስ", streams: ["social"] },
];

export const STREAMS: { id: Stream; label: string; amharic: string }[] = [
  { id: "natural", label: "Natural Science", amharic: "የተፈጥሮ ሳይንስ" },
  { id: "social", label: "Social Science", amharic: "የማኅበራዊ ሳይንስ" },
];

export const subjectsFor = (stream: Stream, list: Subject[] = SUBJECTS) => list.filter((s) => s.streams.includes(stream));

/** Seconds allowed per question in a subject (1 minute unless the subject says otherwise). */
export const secondsPerQuestion = (subject: string, list: Subject[] = SUBJECTS) =>
  Math.round((list.find((s) => s.name === subject)?.minutes ?? (subject === "Mathematics" ? 3 : 1)) * 60);
export const isCommon = (subject: Subject) => subject.streams.length > 1;

export const GRADES = ["Grade 9", "Grade 10", "Grade 11", "Grade 12"] as const;
export type Grade = (typeof GRADES)[number];

/** Students choose Natural or Social Science only in Grades 11 and 12. */
export const needsStream = (grade?: string | null) => grade === "Grade 11" || grade === "Grade 12";

export const streamLabel = (stream?: string | null) => STREAMS.find((s) => s.id === stream)?.label ?? "";

/** Subjects a student studies: their stream's subjects in Grades 11–12, every subject in Grades 9–10. */
export const subjectsForStudent = (grade?: string | null, stream?: string | null, list: Subject[] = SUBJECTS) =>
  needsStream(grade) && (stream === "natural" || stream === "social") ? subjectsFor(stream, list) : list;

/** Validates a grade/stream pair from user input. Returns an error message or the clean values. */
export function parseGradeStream(grade: unknown, stream: unknown): { grade: Grade; stream: Stream | null } | string {
  const g = GRADES.find((x) => x === grade);
  if (!g) return "Choose your grade";
  if (!needsStream(g)) return { grade: g, stream: null };
  if (stream !== "natural" && stream !== "social") return "Choose your stream: Natural Science or Social Science";
  return { grade: g, stream };
}
