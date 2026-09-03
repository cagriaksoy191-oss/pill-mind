// lib/audit.ts
import { prisma } from "./prisma";

/**
 * Mask sensitive PII such as emails and phone numbers to ensure GDPR/KVKK compliance.
 */
function redactPII(text: string): string {
  if (!text) return text;
  
  // Redact email addresses (e.g., john.doe@example.com -> j***e@example.com)
  let redacted = text.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, (match, p1, p2) => {
    if (p1.length > 2) {
      return p1[0] + "***" + p1[p1.length - 1] + "@" + p2;
    }
    return "***@" + p2;
  });

  // Redact common phone number patterns
  redacted = redacted.replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, "[TELEFON MASKELENDİ]");
  
  return redacted;
}

/**
 * Safe, asynchronous audit logger. Never throws errors to the caller to avoid crashing operations.
 */
export async function writeAuditLog({
  eventType,
  entityType,
  entityId,
  userId,
  details,
}: {
  eventType: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  details?: string;
}) {
  const safeDetails = details ? redactPII(details) : null;
  try {
    return await prisma.auditLog.create({
      data: {
        eventType,
        entityType,
        entityId,
        userId,
        details: safeDetails,
      },
    });
  } catch (error) {
    console.error("[PillMind Audit Service] Audit logging failed:", error);
  }
}
