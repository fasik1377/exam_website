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
