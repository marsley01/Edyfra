export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }

  return str.slice(0, maxLength);
}

export function ellipsis(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }

  if (maxLength <= 3) {
    return ".".repeat(maxLength);
  }

  return `${str.slice(0, maxLength - 3)}...`;
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function camelCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => (char as string).toUpperCase())
    .replace(/^[A-Z]/, (char) => char.toLowerCase());
}

export function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

export function snakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

export function pascalCase(str: string): string {
  const camel = camelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

export function capitalize(str: string): string {
  if (str.length === 0) {
    return str;
  }

  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function titleize(str: string): string {
  const smallWords =
    /^(a|an|and|as|at|but|by|for|if|in|of|on|or|the|to|with)$/i;

  return str
    .toLowerCase()
    .split(" ")
    .map((word, index) => {
      if (index > 0 && smallWords.test(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function template(
  str: string,
  data: Record<string, string | number>,
): string {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = data[key];
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
}

export function indent(str: string, level: number, char = "  "): string {
  const prefix = char.repeat(level);
  return str
    .split("\n")
    .map((line) => (line.length > 0 ? `${prefix}${line}` : line))
    .join("\n");
}

export function dedent(str: string): string {
  const lines = str.split("\n");

  if (lines.length === 0) {
    return str;
  }

  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

  if (nonEmptyLines.length === 0) {
    return str.trim();
  }

  const minIndent = Math.min(
    ...nonEmptyLines.map((line) => {
      const match = /^(\s*)/.exec(line);
      return match !== null ? match[1]?.length ?? 0 : 0;
    }),
  );

  return lines
    .map((line) => line.slice(minIndent))
    .join("\n")
    .trim();
}

const ANSI_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

export function stripAnsi(str: string): string {
  return str.replace(ANSI_REGEX, "");
}

const HTML_TAG_REGEX = /<[^>]*>/g;

export function stripHtml(str: string): string {
  return str.replace(HTML_TAG_REGEX, "");
}
