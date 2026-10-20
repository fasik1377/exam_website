export type Stream = "natural" | "social";

export type Subject = {
  name: string;
  amharic: string;
  streams: Stream[];
};

/** National exam subjects. English, Mathematics and Scholastic Aptitude are common to both streams. */
export const SUBJECTS: Subject[] = [
  { name: "English", amharic: "እንግሊዝኛ", streams: ["natural", "social"] },
  { name: "Mathematics", amharic: "ሒሳብ", streams: ["natural", "social"] },
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

export const subjectsFor = (stream: Stream) => SUBJECTS.filter((s) => s.streams.includes(stream));
export const isCommon = (subject: Subject) => subject.streams.length > 1;

export const GRADES = ["Grade 9", "Grade 10", "Grade 11", "Grade 12"] as const;
export type Grade = (typeof GRADES)[number];

/** Students choose Natural or Social Science only in Grades 11 and 12. */
export const needsStream = (grade?: string | null) => grade === "Grade 11" || grade === "Grade 12";

export const streamLabel = (stream?: string | null) => STREAMS.find((s) => s.id === stream)?.label ?? "";

/** Subjects a student studies: their stream's subjects in Grades 11–12, every subject in Grades 9–10. */
export const subjectsForStudent = (grade?: string | null, stream?: string | null) =>
  needsStream(grade) && (stream === "natural" || stream === "social") ? subjectsFor(stream) : SUBJECTS;

/** Validates a grade/stream pair from user input. Returns an error message or the clean values. */
export function parseGradeStream(grade: unknown, stream: unknown): { grade: Grade; stream: Stream | null } | string {
  const g = GRADES.find((x) => x === grade);
  if (!g) return "Choose your grade";
  if (!needsStream(g)) return { grade: g, stream: null };
  if (stream !== "natural" && stream !== "social") return "Choose your stream: Natural Science or Social Science";
  return { grade: g, stream };
}
