import { pgEnum } from "drizzle-orm/pg-core";

export const auditActionEnum = pgEnum("audit_action", [
  "INSERT",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "ALLOCATE",
  "CANCEL_ALLOCATION",
  "PAYMENT",
  "APPROVE",
  "DENY",
]);
