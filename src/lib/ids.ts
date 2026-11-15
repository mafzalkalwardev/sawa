import { randomBytes } from "crypto";

export function nid(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

export function pinCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function shareToken() {
  return randomBytes(12).toString("hex");
}
