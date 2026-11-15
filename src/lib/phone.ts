export function normalizePhone(input: string) {
  const raw = input.trim().replace(/[\s()-]/g, "");
  if (!raw) return "";
  if (raw.startsWith("+")) return `+${raw.slice(1).replace(/\D/g, "")}`;
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("971")) return `+${digits}`;
  if (digits.startsWith("0")) return `+971${digits.slice(1)}`;
  if (digits.length === 9) return `+971${digits}`;
  return `+${digits}`;
}

export function phoneLabel(phone: string) {
  return phone.replace("+971", "0");
}
