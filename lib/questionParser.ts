/**
 * Turns the plain text of an uploaded exam document into structured multiple-choice questions.
 *
 * Understands the layouts teachers commonly use:
 *   1. Question text            Q1) / Question 1: / 1- also work
 *   A. choice  B) choice  (c) choice    — one per line or several on one line
 *   Answer: B                  Ans: b / Correct answer - B / a "*" on the right choice
 *   Explanation: why ...       optional, may span several lines
 * plus an "Answer key" section at the end (1. B  2-C  3) A ...).
 */

export type ParsedQuestion = {
  number: number | null;
  prompt: string;
  choices: string[];
  correctAnswer: number; // -1 when unknown
  explanation: string;
  issues: string[];
};

const QUESTION = /^(?:q(?:uestion)?\s*\.?\s*)?(\d{1,3})\s*[.)\-:–]\s*(.+)$/i;
const CHOICE = /^\(?([a-h])\s*[.)\]:–-]\s*(.*)$/i;
const ANSWER = /^(?:the\s+)?(?:correct\s+)?(?:answer|ans|key)\s*(?:is)?\s*[:.\-–=]?\s*\(?([a-h])\)?(?:[\s.).:,-]|$)/i;
const EXPLANATION = /^(?:explanation|explain|reason|solution|rationale)\s*[:.\-–]\s*(.*)$/i;
const KEY_HEADER = /^(?:answer\s*key|answers?|key)\s*[:.\-–]?\s*$/i;
const KEY_PAIR = /(\d{1,3})\s*[.)\-:=–]?\s*\(?([a-h])\)?(?![a-z])/gi;
const MARK = /^\*+\s*|\s*\*+$|\s*\((?:correct|answer)\)\s*$|\s*✓\s*$/i;

const letterIndex = (letter: string) => letter.toUpperCase().charCodeAt(0) - 65;

/** Splits "A. 2  B. 4  C. 6  D. 8" into separate choice lines. */
function splitInlineChoices(line: string): string[] {
  if (!/^\(?a\s*[.)]/i.test(line) || !/\s\(?b\s*[.)]\s/i.test(line)) return [line];
  return line.split(/\s+(?=\(?[b-h]\s*[.)]\s)/i);
}

/** Restores line structure when a PDF or paste flattened it into long lines. */
function restoreLines(text: string) {
  const lines = text.split("\n");
  const longLines = lines.filter((l) => l.length > 220).length;
  if (longLines < Math.max(1, lines.length * 0.2)) return text;
  return text
    .replace(/\s+(?=(?:q(?:uestion)?\s*)?\d{1,3}\s*[.)]\s+\S)/gi, "\n")
    .replace(/\s+(?=\(?[A-H]\s*[.)]\s+\S)/g, "\n")
    .replace(/\s+(?=(?:answer|ans|explanation)\s*[:.-])/gi, "\n");
}

export function parseQuestions(raw: string): { questions: ParsedQuestion[]; warnings: string[] } {
  const warnings: string[] = [];
  const text = restoreLines(raw.replace(/\r\n?/g, "\n").replace(/[ \t]/g, " ").replace(/[•▪●]/g, ""));
  const lines = text.split("\n").map((l) => l.trim()).flatMap(splitInlineChoices).map((l) => l.trim()).filter(Boolean);

  const questions: ParsedQuestion[] = [];
  let current: ParsedQuestion | null = null;
  let mode: "prompt" | "choices" | "explanation" | "key" = "prompt";
  const answerKey = new Map<number, number>();

  const finish = () => {
    if (current && (current.prompt || current.choices.length)) questions.push(current);
    current = null;
  };

  for (const line of lines) {
    if (KEY_HEADER.test(line)) { finish(); mode = "key"; continue; }
    if (mode === "key") {
      // Inside an answer key everything is "number → letter".
      let matched = false;
      for (const m of line.matchAll(KEY_PAIR)) { answerKey.set(Number(m[1]), letterIndex(m[2])); matched = true; }
      if (matched) continue;
      mode = "prompt";
    }

    const answer = line.match(ANSWER);
    if (answer && current) { current.correctAnswer = letterIndex(answer[1]); mode = "choices"; continue; }

    const explanation = line.match(EXPLANATION);
    if (explanation && current) { current.explanation = explanation[1].trim(); mode = "explanation"; continue; }

    const question = line.match(QUESTION);
    // "12. B" on its own is an answer-key entry, not a new question.
    if (question && /^\(?[a-h]\)?\.?$/i.test(question[2].trim())) {
      answerKey.set(Number(question[1]), letterIndex(question[2].replace(/[^a-h]/gi, "")));
      continue;
    }
    if (question) {
      finish();
      current = { number: Number(question[1]), prompt: question[2].trim(), choices: [], correctAnswer: -1, explanation: "", issues: [] };
      mode = "prompt";
      continue;
    }

    const choice = line.match(CHOICE);
    if (choice && current && (mode === "prompt" || mode === "choices") && letterIndex(choice[1]) === current.choices.length) {
      let value = choice[2].trim();
      if (MARK.test(value) || /^\*/.test(line)) { current.correctAnswer = current.choices.length; value = value.replace(MARK, "").trim(); }
      current.choices.push(value);
      mode = "choices";
      continue;
    }
    // "*B. text" — answer marked with a leading star.
    const starred = line.replace(/^\*+\s*/, "").match(CHOICE);
    if (line.startsWith("*") && starred && current && letterIndex(starred[1]) === current.choices.length) {
      current.correctAnswer = current.choices.length;
      current.choices.push(starred[2].trim());
      mode = "choices";
      continue;
    }

    if (!current) {
      // A question without a number: start one if the next lines turn out to be choices.
      current = { number: null, prompt: line, choices: [], correctAnswer: -1, explanation: "", issues: [] };
      mode = "prompt";
      continue;
    }
    // Continuation of whatever we are reading.
    if (mode === "explanation") current.explanation = `${current.explanation} ${line}`.trim();
    else if (mode === "choices" && current.choices.length) current.choices[current.choices.length - 1] += ` ${line}`;
    else current.prompt = `${current.prompt} ${line}`.trim();
  }
  finish();

  // Drop leading text (titles, instructions) that never got choices.
  const kept = questions.filter((q) => q.choices.length > 0);
  const dropped = questions.length - kept.length;
  if (dropped) warnings.push(`${dropped} block${dropped === 1 ? "" : "s"} of text without answer choices (titles or instructions) were skipped.`);

  for (const q of kept) {
    if (q.correctAnswer < 0 && q.number !== null && answerKey.has(q.number)) q.correctAnswer = answerKey.get(q.number)!;
    validate(q);
  }
  if (!kept.length) warnings.push("No questions were recognised. Check that questions are numbered and choices start with A., B., C., D.");
  return { questions: kept, warnings };
}

/** Recomputes the problems that block publishing a question. */
export function validate(q: ParsedQuestion) {
  q.issues = [];
  if (q.prompt.trim().length < 3) q.issues.push("Question text is missing");
  if (q.choices.filter((c) => c.trim()).length < 2) q.issues.push("Needs at least two choices");
  if (q.choices.some((c) => !c.trim())) q.issues.push("A choice is empty");
  if (q.correctAnswer < 0 || q.correctAnswer >= q.choices.length) q.issues.push("Correct answer not found — select it");
  return q;
}

export const TEMPLATE = `Grade 12 Mathematics — Unit 1 practice questions

1. What is the value of x if 3x + 6 = 21?
A. x = 3
B. x = 5
C. x = 7
D. x = 9
Answer: B
Explanation: Subtract 6 from both sides to get 3x = 15, then divide by 3.

2. The square root of 144 is:
A. 10   B. 11   C. 12   D. 14
Answer: C

3. Which of these is a prime number?
A. 21
*B. 23
C. 25
D. 27

4. If 2(x + 4) = 18, what is x?
A) 3
B) 5
C) 7
D) 9

Answer key
4. B
`;
