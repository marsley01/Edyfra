export type TimeOfDay = "morning" | "afternoon" | "evening" | "late";

const RANGES: Array<{ key: TimeOfDay; start: number; end: number; prefix: string; emoji: string }> = [
  { key: "morning", start: 5, end: 12, prefix: "Good morning", emoji: "☀️" },
  { key: "afternoon", start: 12, end: 17, prefix: "Good afternoon", emoji: "👋" },
  { key: "evening", start: 17, end: 21, prefix: "Good evening", emoji: "🌙" },
  { key: "late", start: 21, end: 29, prefix: "Studying late", emoji: "💪" },
];

function bucketForHour(hour: number) {
  const h = ((hour % 24) + 24) % 24;
  return RANGES.find((r) => h >= r.start && h < r.end) ?? RANGES[0];
}

export function getTimeOfDay(now: Date = new Date()): TimeOfDay {
  return bucketForHour(now.getHours()).key;
}

export function getTimeGreeting(name: string, now: Date = new Date()) {
  const bucket = bucketForHour(now.getHours());
  const cleanName = name?.trim() || "friend";
  if (bucket.key === "late") {
    return {
      text: `Studying late, ${cleanName}?`,
      emoji: bucket.emoji,
      key: bucket.key,
    };
  }
  return {
    text: `${bucket.prefix}, ${cleanName}`,
    emoji: bucket.emoji,
    key: bucket.key,
  };
}
