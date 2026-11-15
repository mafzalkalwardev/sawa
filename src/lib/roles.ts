export const ROLES = [
  "owner",
  "operations",
  "dispatcher",
  "onboarding",
  "support",
  "finance",
  "readonly",
] as const;

export type Role = (typeof ROLES)[number];

export type StaffAction =
  | "assign"
  | "drivers"
  | "customers"
  | "tickets"
  | "notes"
  | "billing"
  | "refund"
  | "payouts"
  | "settings"
  | "import"
  | "export";

const matrix: Record<Role, StaffAction[]> = {
  owner: ["assign", "drivers", "customers", "tickets", "notes", "billing", "refund", "payouts", "settings", "import", "export"],
  operations: ["assign", "drivers", "customers", "tickets", "notes", "billing", "refund", "payouts", "import", "export"],
  dispatcher: ["assign", "tickets", "notes", "export"],
  onboarding: ["drivers", "customers", "notes", "import"],
  support: ["tickets", "notes"],
  finance: ["billing", "refund", "payouts", "export", "notes"],
  readonly: [],
};

export function can(role: string, action: StaffAction) {
  const list = matrix[role as Role];
  return Array.isArray(list) && list.includes(action);
}
