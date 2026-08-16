import { v4 as uuidv4 } from "uuid";

const PREFIXES = {
  agent: "ag",
  task: "task",
  session: "sess",
  run: "run",
  correlation: "corr",
  span: "span",
  trace: "trace",
  event: "evt",
} as const;

function generatePrefixedId(prefix: string): string {
  return `${prefix}_${uuidv4()}`;
}

export function generateAgentId(): string {
  return generatePrefixedId(PREFIXES.agent);
}

export function generateTaskId(): string {
  return generatePrefixedId(PREFIXES.task);
}

export function generateSessionId(): string {
  return generatePrefixedId(PREFIXES.session);
}

export function generateRunId(): string {
  return generatePrefixedId(PREFIXES.run);
}

export function generateCorrelationId(): string {
  return generatePrefixedId(PREFIXES.correlation);
}

export function generateSpanId(): string {
  return generatePrefixedId(PREFIXES.span);
}

export function generateTraceId(): string {
  return generatePrefixedId(PREFIXES.trace);
}

export function generateEventId(): string {
  return generatePrefixedId(PREFIXES.event);
}

export function generateShortId(length = 8): string {
  const hex = uuidv4().replace(/-/g, "");
  return hex.slice(0, Math.max(1, length));
}
