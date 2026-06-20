const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LENGTH = 6;

function randomChars(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return result;
}

export function generateReferralCode(name?: string | null): string {
  const randomPart = randomChars(CODE_LENGTH);

  if (!name) return randomPart;

  const cleanName = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (cleanName.length === 0) return randomPart;

  // Prefix first 2 chars of name + 4 random chars => exactly 6 chars total
  const prefix = cleanName.substring(0, 2);
  return `${prefix}${randomChars(CODE_LENGTH - prefix.length)}`;
}
