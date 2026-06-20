import DOMPurify from "isomorphic-dompurify";

export function sanitizeText(input: string): string {
  if (!input) return "";

  const stripped = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });

  return stripped
    .replace(/\0/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
}

export function sanitizeRichText(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "br", "ul", "ol", "li"],
    ALLOWED_ATTR: [],
    FORBID_TAGS: [
      "script",
      "iframe",
      "object",
      "embed",
      "form",
      "input",
      "link",
      "style",
      "meta",
      "base",
    ],
  });
}

export function escapeSQLString(input: string): string {
  return input
    .replace(/'/g, "''")
    .replace(/;/g, "")
    .replace(/--/g, "")
    .replace(/\/\*/g, "")
    .replace(/\*\//g, "");
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/\.\./g, "")
    .replace(/[\/\\]/g, "")
    .replace(/\0/g, "")
    .replace(/[^\w.\-]/g, "_")
    .slice(0, 100);
}
