/**
 * Turns the plain text of an uploaded exam document into structured questions —
 * multiple choice and true/false.
 *
 * Multiple choice:
 *   1. Question text            Q1) / Question 1: / 1- also work
 *   A. choice  B) choice  (c) choice    — one per line or several on one line
 *   Answer: B                  Ans: b / Correct answer - B / a "*" on the right choice
 *   Explanation: why ...       optional, may span several lines
 *
 * True / false (any of these):
 *   a "True or False" / "Part I: True/False" heading before the questions
 *   1. The Nile is the longest river. (True/False)
 *   1. True or False: Water boils at 100 °C at sea level.
 *   Answer: True  /  Answer: F  /  choices "A. True  B. False"
 *
 * Plus an "Answer key" section at the end: "1. B  2-C  3) True  4. F".
 */

export type QuestionType = "mcq" | "truefalse";

export type ParsedQuestion = {
  number: number | null;
  type: QuestionType;
  prompt: string;
  choices: string[];
  correctAnswer: number; // -1 when unknown
  explanation: string;
  issues: string[];
};

export const TRUE_FALSE = ["True", "False"];

const QUESTION = /^(?:q(?:uestion)?\s*\.?\s*)?(\d{1,3})\s*[.)\-:–]\s*(.+)$/i;
const CHOICE = /^\(?([a-h])\s*[.)\]:–-]\s*(.*)$/i;
const ANSWER = /^(?:the\s+)?(?:correct\s+)?(?:answer|ans|key)\s*(?:is)?\s*[:.\-–=]?\s*\(?(true|false|[a-h]|t)\)?(?:[\s.).:,-]|$)/i;
const EXPLANATION = /^(?:explanation|explain|reason|solution|rationale)\s*[:.\-–]\s*(.*)$/i;
const KEY_HEADER = /^(?:answer\s*key|answers?|key)\s*[:.\-–]?\s*$/i;
const KEY_PAIR = /(\d{1,3})\s*[.)\-:=–]?\s*\(?(true|false|[a-h])\)?(?![a-z])/gi;
const KEY_ONLY = /^\(?(true|false|[a-ht])\)?\.?$/i; // "12. B" / "12. True" / "12. T" on its own line
const MARK = /^\*+\s*|\s*\*+$|\s*\((?:correct|answer)\)\s*$|\s*✓\s*$/i;
const TF_HEADER = /\btrue\s*(?:or|\/|-|and)\s*false\b/i;
const MCQ_HEADER = /\b(?:multiple\s*choice|choose\s+the\s+(?:correct|best)|select\s+the\s+(?:correct|best))\b/i;
const SECTION = /^(?:part|section)\s+(?:[ivx]+|\d+|[a-d])\b/i;
const TF_TAG = /\s*[([]\s*(?:true\s*(?:or|\/)\s*false|t\s*\/\s*f)\s*[)\]]\s*$/i;
const TF_PREFIX = /^(?:true\s*(?:or|\/)\s*false|t\s*\/\s*f)\s*[:.\-–]\s*/i;

const letterIndex = (letter: string) => letter.toUpperCase().charCodeAt(0) - 65;
const isTrueFalseChoices = (choices: string[]) => choices.length === 2 && /^true\.?$/i.test(choices[0].trim()) && /^false\.?$/i.test(choices[1].trim());

/** Resolves an answer token ("B", "true", "F") for a question of the given type. */
function answerFor(token: string, type: QuestionType) {
  const t = token.toLowerCase();
  if (type === "truefalse") {
    if (t === "true" || t === "t" || t === "a") return 0;
    if (t === "false" || t === "f" || t === "b") return 1;
    return -1;
  }
  if (t === "true" || t === "false") return -1;
  return letterIndex(t);
}

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

type Draft = ParsedQuestion & { tfHint: boolean; answerToken: string | null };

const FENCE = /^[ \t]*```[ \t]*([\w+#.-]*)[^\n]*\n([\s\S]*?)\n?[ \t]*```[ \t]*$/gm;

/**
 * Parses questions, keeping ``` code blocks exactly as written: they are set aside while the
 * text is analysed (so numbered code lines aren't mistaken for questions) and put back after.
 */
export function parseQuestions(raw: string): { questions: ParsedQuestion[]; warnings: string[] } {
  const blocks: string[] = [];
  const stashed = raw.replace(/\r\n?/g, "\n").replace(FENCE, (_, lang: string, code: string) => {
    blocks.push("```" + lang + "\n" + code.replace(/\s+$/, "") + "\n```");
    return `\n⟦CODE${blocks.length - 1}⟧\n`;
  });
  const result = parseText(stashed);
  if (!blocks.length) return result;
  const restore = (text: string) => text.replace(/\s*⟦CODE(\d+)⟧\s*/g, (_, i: string) => `\n${blocks[Number(i)]}\n`).trim();
  for (const q of result.questions) {
    q.prompt = restore(q.prompt);
    q.explanation = restore(q.explanation);
    q.choices = q.choices.map(restore);
    validate(q);
  }
  return result;
}

function parseText(raw: string): { questions: ParsedQuestion[]; warnings: string[] } {
  const warnings: string[] = [];
  const text = restoreLines(raw.replace(/\r\n?/g, "\n").replace(/[ \t]/g, " ").replace(/[•▪●]/g, ""));
  const lines = text.split("\n").map((l) => l.trim()).flatMap(splitInlineChoices).map((l) => l.trim()).filter(Boolean);

  const drafts: Draft[] = [];
  let current: Draft | null = null;
  let mode: "prompt" | "choices" | "explanation" | "key" = "prompt";
  let tfSection = false;
  const answerKey = new Map<number, string>();

  const start = (number: number | null, prompt: string): Draft => {
    let tfHint = tfSection;
    if (TF_TAG.test(prompt) || TF_PREFIX.test(prompt)) { tfHint = true; prompt = prompt.replace(TF_TAG, "").replace(TF_PREFIX, ""); }
    return { number, type: "mcq", prompt: prompt.trim(), choices: [], correctAnswer: -1, explanation: "", issues: [], tfHint, answerToken: null };
  };
  const finish = () => {
    if (current && (current.prompt || current.choices.length)) drafts.push(current);
    current = null;
  };

  for (const line of lines) {
    if (KEY_HEADER.test(line)) { finish(); mode = "key"; continue; }
    if (mode === "key") {
      let matched = false;
      for (const m of line.matchAll(KEY_PAIR)) { answerKey.set(Number(m[1]), m[2]); matched = true; }
      if (matched) continue;
      mode = "prompt";
    }

    const answer = line.match(ANSWER);
    if (answer && current) { current.answerToken = answer[1]; mode = "choices"; continue; }

    const explanation = line.match(EXPLANATION);
    if (explanation && current) { current.explanation = explanation[1].trim(); mode = "explanation"; continue; }

    const question = line.match(QUESTION);
    if (question && KEY_ONLY.test(question[2].trim())) {
      answerKey.set(Number(question[1]), question[2].replace(/[^a-z]/gi, ""));
      continue;
    }
    if (question) {
      finish();
      current = start(Number(question[1]), question[2]);
      mode = "prompt";
      continue;
    }

    // Section headings switch the default question type for what follows.
    if (!CHOICE.test(line) && line.length < 120 && (TF_HEADER.test(line) || MCQ_HEADER.test(line)) && (SECTION.test(line) || !current || current.choices.length || mode !== "prompt")) {
      finish();
      tfSection = TF_HEADER.test(line) && !MCQ_HEADER.test(line);
      continue;
    }

    const choice = line.match(CHOICE);
    if (choice && current && (mode === "prompt" || mode === "choices") && letterIndex(choice[1]) === current.choices.length) {
      let value = choice[2].trim();
      if (MARK.test(value)) { current.answerToken = choice[1]; value = value.replace(MARK, "").trim(); }
      current.choices.push(value);
      mode = "choices";
      continue;
    }
    // "*B. text" — answer marked with a leading star.
    const starred = line.replace(/^\*+\s*/, "").match(CHOICE);
    if (line.startsWith("*") && starred && current && letterIndex(starred[1]) === current.choices.length) {
      current.answerToken = starred[1];
      current.choices.push(starred[2].trim());
      mode = "choices";
      continue;
    }

    if (!current) {
      current = start(null, line);
      mode = "prompt";
      continue;
    }
    if (mode === "explanation") current.explanation = `${current.explanation} ${line}`.trim();
    else if (mode === "choices" && current.choices.length) current.choices[current.choices.length - 1] += ` ${line}`;
    else current.prompt = `${current.prompt} ${line}`.trim();
  }
  finish();

  const questions: ParsedQuestion[] = [];
  let skipped = 0;
  for (const d of drafts) {
    const token = d.answerToken ?? (d.number !== null ? answerKey.get(d.number) ?? null : null);
    const tfAnswer = token !== null && /^(true|false|t|f)$/i.test(token);
    const isTrueFalse = isTrueFalseChoices(d.choices) || (!d.choices.length && (d.tfHint || tfAnswer));
    if (!isTrueFalse && !d.choices.length) { skipped++; continue; }
    const type: QuestionType = isTrueFalse ? "truefalse" : "mcq";
    const q: ParsedQuestion = {
      number: d.number, type, prompt: d.prompt, choices: type === "truefalse" ? [...TRUE_FALSE] : d.choices,
      correctAnswer: token !== null ? answerFor(token, type) : -1, explanation: d.explanation, issues: [],
    };
    questions.push(validate(q));
  }
  if (skipped) warnings.push(`${skipped} block${skipped === 1 ? "" : "s"} of text without answer choices (titles or instructions) were skipped.`);
  if (!questions.length) warnings.push("No questions were recognised. Number your questions, start choices with A., B., C., D., and mark true/false questions with a “True or False” heading or (True/False).");
  return { questions, warnings };
}

/** Recomputes the problems that block publishing a question. */
export function validate(q: ParsedQuestion) {
  q.issues = [];
  if (q.prompt.trim().length < 3) q.issues.push("Question text is missing");
  if (q.type === "mcq") {
    if (q.choices.filter((c) => c.trim()).length < 2) q.issues.push("Needs at least two choices");
    if (q.choices.some((c) => !c.trim())) q.issues.push("A choice is empty");
  }
  if (q.correctAnswer < 0 || q.correctAnswer >= q.choices.length) q.issues.push(q.type === "truefalse" ? "Choose True or False" : "Correct answer not found — select it");
  return q;
}

/** Switches a parsed question between the two formats, keeping what still makes sense. */
export function convertType(q: ParsedQuestion, type: QuestionType): ParsedQuestion {
  if (q.type === type) return q;
  if (type === "truefalse") return validate({ ...q, type, choices: [...TRUE_FALSE], correctAnswer: q.correctAnswer > 1 ? -1 : q.correctAnswer });
  return validate({ ...q, type, choices: isTrueFalseChoices(q.choices) ? ["", "", "", ""] : q.choices, correctAnswer: -1 });
}

export const TEMPLATE = `Grade 12 Mathematics — Unit 1 practice questions

Part I: Choose the correct answer

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

Part II: True or False

4. Every square is a rectangle.
Answer: True
Explanation: A square has four right angles, so it is a special rectangle.

5. The sum of the angles in a triangle is 360°.
Answer: False

6. Zero is an even number. (True/False)

Answer key
6. True
`;
