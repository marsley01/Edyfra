export function generateReferralCode(name?: string | null, length = 4): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let randomPart = "";
  for (let i = 0; i < length; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  if (!name) return randomPart;
  
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 5).toUpperCase();
  if (cleanName.length === 0) return randomPart;
  
  return `${cleanName}-${randomPart}`;
}
