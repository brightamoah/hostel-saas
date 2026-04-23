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
  "CREATE",
  "STATUS_CHANGE",
  "PASSWORD_RESET",
  "ROLE_CHANGE",
  "PERMISSION_CHANGE",
  "DATA_EXPORT",
  "DATA_IMPORT",
  "OTHER",
]);
