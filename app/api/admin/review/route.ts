// app/api/admin/review/route.ts
import { NextRequest } from "next/server";

import { jsonNoStore } from "@/lib/http";
import { getSession, verifyCSRF } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { Status } from "@prisma/client";

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
        { error: "Klinik onay işlemi gerçekleştirmek için lütfen giriş yapın." },
        401
      );
    }

    // Fetch user from database to check authorization
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "CLINICAL_REVIEWER")) {
      return jsonNoStore(
        { error: "Klinik onay işlemi için yetkiniz bulunmamaktadır." },
        403
      );
    }

    const body = await request.json();
    const { interactionId, status, notes, evidenceSourceId } = body as {
      interactionId: string;
      status: string;
      notes?: string;
      evidenceSourceId?: string;
    };

    if (!interactionId || !status) {
      return jsonNoStore(
        { error: "interactionId ve status parametreleri zorunludur." },
        400
      );
    }

    // Check valid status enum value
    const uppercaseStatus = status.toUpperCase();
    if (uppercaseStatus !== "VERIFIED" && uppercaseStatus !== "PENDING" && uppercaseStatus !== "DEPRECATED") {
      return jsonNoStore(
        { error: "Geçersiz durum değeri. (VERIFIED, PENDING veya DEPRECATED olmalıdır)" },
        400
      );
    }

    // Find the drug interaction to update
    const interaction = await prisma.drugInteraction.findUnique({
      where: { id: interactionId },
    });

    if (!interaction) {
      return jsonNoStore(
        { error: "Belirtilen ilaç etkileşimi bulunamadı." },
        404
      );
    }

    // Update interaction status
    const updatedInteraction = await prisma.drugInteraction.update({
      where: { id: interactionId },
      data: {
        verificationStatus: uppercaseStatus as Status,
      },
    });

    // Create Clinical Review entry
    const review = await prisma.clinicalReview.create({
      data: {
        entityType: "DrugInteraction",
        entityId: interactionId,
        reviewerRole: "CLINICAL_REVIEWER",
        reviewerId: session.userId,
        decision: uppercaseStatus,
        notes: notes || null,
        evidenceSourceId: evidenceSourceId || null,
      },
    });

    // Log the action via audit service (masking run inside)
    await writeAuditLog({
      eventType: "CLINICAL_REVIEW_UPDATE",
      entityType: "DrugInteraction",
      entityId: interactionId,
      userId: session.userId,
      details: `User ${session.email} updated verification status of interaction ${interactionId} to ${uppercaseStatus}. Notes: ${notes || "None"}`,
    });

    return jsonNoStore({
      success: true,
      interaction: updatedInteraction,
      review,
    });
  } catch (error) {
    console.error("[Clinical Review Endpoint Error]:", error);
    return jsonNoStore(
      { error: "Onay durumu güncellenirken sistemsel bir hata oluştu." },
      500
    );
  }
}
