// app/api/pillbox/share/route.ts
import { NextRequest } from "next/server";

import { jsonNoStore } from "@/lib/http";
import { getSession, verifyCSRF } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // CSRF check
    if (!verifyCSRF(request)) {
      return jsonNoStore(
        { error: "Güvenlik doğrulaması başarısız oldu (CSRF engellendi)." },
        403
      );
    }

    // Auth check
    const session = await getSession(request);
    if (!session) {
      return jsonNoStore(
        { error: "Rapor paylaşmak için lütfen önce giriş yapın." },
        401
      );
    }

    const body = await request.json();
    const { drugIds, summary } = body as { drugIds: string[]; summary?: unknown };

    if (!drugIds || !Array.isArray(drugIds) || drugIds.length === 0) {
      return jsonNoStore(
        { error: "Paylaşmak için en az 1 ilaç seçilmelidir." },
        400
      );
    }

    let stringifiedSummary: string | null = null;
    if (summary) {
      try {
        stringifiedSummary = JSON.stringify(summary);
        if (stringifiedSummary.length > 50000) {
          return jsonNoStore(
            { error: "Özet verisi çok büyük. Lütfen daha kısa bir özet girin." },
            413
          );
        }
      } catch (error) {
        return jsonNoStore(
          { error: "Geçersiz özet verisi formatı." },
          400
        );
      }
    }

    // Generate unique token (secure random hash)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    // Expires in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Save PillboxShare snapshot
    const share = await prisma.pillboxShare.create({
      data: {
        token: hashedToken,
        drugIds,
        summary: stringifiedSummary,
        expiresAt,
      },
    });

    // Write Audit Log (masking/PII checks run inside writeAuditLog)
    await writeAuditLog({
      eventType: "SHARE_CREATED",
      entityType: "PillboxShare",
      entityId: share.id,
      userId: session.userId,
      details: `User ${session.email} created a shareable link for ${drugIds.length} drugs: ${drugIds.join(", ")}`,
    });

    return jsonNoStore({
      success: true,
      token: rawToken,
      shareUrl: `/share/${rawToken}`,
      expiresAt: share.expiresAt,
    });
  } catch (error) {
    console.error("[Pillbox Share Endpoint Error]:", error);
    return jsonNoStore(
      { error: "Paylaşım bağlantısı oluşturulurken sistemsel bir hata oluştu." },
      500
    );
  }
}
