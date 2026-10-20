import mammoth from "mammoth";
import { extractText } from "unpdf";
import WordExtractor from "word-extractor";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export class UnsupportedDocumentError extends Error {}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " };
const decode = (s: string) => s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e: string) => ENTITIES[e]).replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)));

/**
 * Converts mammoth's HTML to plain lines, re-creating Word's automatic list numbering
 * (lost in raw text): first-level numbered items become "1.", "2." and nested ones "A.", "B.".
 */
function htmlToLines(html: string) {
  const out: string[] = [];
  let line = "";
  const lists: { ordered: boolean; count: number }[] = [];
  // Word continues top-level numbering across separate lists (question 2 follows question 1), so keep one running count.
  let questionNumber = 0;
  const flush = () => { if (line.trim()) out.push(line.trim()); line = ""; };

  for (const [token, tag] of Array.from(html.matchAll(/<\/?([a-z0-9]+)[^>]*>|[^<]+/gi), (m) => [m[0], m[1]?.toLowerCase()] as const)) {
    if (!tag) { line += decode(token); continue; }
    const closing = token.startsWith("</");
    if (tag === "ol" || tag === "ul") {
      flush();
      if (closing) lists.pop(); else lists.push({ ordered: tag === "ol", count: 0 });
    } else if (tag === "li" && !closing) {
      flush();
      const list = lists[lists.length - 1];
      if (list?.ordered) {
        list.count += 1;
        line = lists.length >= 2 ? `${String.fromCharCode(64 + list.count)}. ` : `${++questionNumber}. `;
      }
    } else if (["p", "li", "br", "tr", "h1", "h2", "h3", "h4", "h5", "h6", "div"].includes(tag)) {
      flush();
    } else if (tag === "td" && closing) {
      line += "  ";
    } else if (tag === "img" && !closing) {
      line += " [image] ";
    }
  }
  flush();
  return out.join("\n");
}

/** Extracts readable text from an uploaded .docx, .pdf or .txt file. */
export async function documentText(fileName: string, bytes: ArrayBuffer): Promise<{ text: string; notes: string[] }> {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  const notes: string[] = [];
  if (ext === "doc") {
    // Legacy Word 97–2003 binary format.
    try {
      const doc = await new WordExtractor().extract(Buffer.from(bytes));
      return { text: doc.getBody(), notes: ["Automatic numbering in old .doc files can't always be read — if questions are missing, number them by hand or save as .docx."] };
    } catch {
      throw new UnsupportedDocumentError("This .doc file could not be read. In Word choose File → Save As → Word Document (.docx), then upload again.");
    }
  }
  if (ext === "docx") {
    const { value } = await mammoth.convertToHtml({ buffer: Buffer.from(bytes) });
    if (value.includes("<img")) notes.push("Images or equation objects in the document were not imported — add them to the question text if needed.");
    return { text: htmlToLines(value), notes };
  }
  if (ext === "pdf") {
    const { text } = await extractText(new Uint8Array(bytes), { mergePages: true });
    if (!text.trim()) throw new UnsupportedDocumentError("This PDF has no selectable text (it may be a scanned image). Upload the original Word file or a text-based PDF.");
    return { text, notes };
  }
  if (ext === "txt") return { text: new TextDecoder().decode(bytes), notes };
  throw new UnsupportedDocumentError("Upload a .doc, .docx, .pdf or .txt file.");
}
