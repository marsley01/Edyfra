export function getAdminEmails(): string[] {
  const emails: string[] = [];
  const e1 = process.env.ADMIN_EMAIL_1;
  const e2 = process.env.ADMIN_EMAIL_2;
  if (e1) emails.push(e1.toLowerCase().trim());
  if (e2) emails.push(e2.toLowerCase().trim());
  return emails;
}

export function isFounderEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = getAdminEmails();
  return admins.includes(email.toLowerCase().trim());
}
