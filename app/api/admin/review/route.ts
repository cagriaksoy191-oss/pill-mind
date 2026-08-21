import * as Sentry from "@sentry/nextjs";
// app/api/admin/review/route.ts
import { NextRequest, NextResponse } from "next/server";

import { jsonNoStore } from "@/lib/http";
import { getSession, verifyCSRF, SessionData } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { Status, DrugInteraction, ClinicalReview } from "@prisma/client";

export const dynamic = "force-dynamic";

async function checkAuthorization(request: NextRequest): Promise<{ errorResponse?: NextResponse; session?: SessionData }> {
  if (!verifyCSRF(request)) {
    return { errorResponse: jsonNoStore({ error: "Güvenlik doğrulaması başarısız oldu (CSRF engellendi)." }, 403) };
  }

  const session = await getSession(request);
  if (!session) {
    return { errorResponse: jsonNoStore({ error: "Klinik onay işlemi gerçekleştirmek için lütfen giriş yapın." }, 401) };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (!user || (user.role !== "ADMIN" && user.role !== "CLINICAL_REVIEWER")) {
    return { errorResponse: jsonNoStore({ error: "Klinik onay işlemi için yetkiniz bulunmamaktadır." }, 403) };
  }

  return { session };
}

function validateInput(body: unknown): {
  errorResponse?: NextResponse;
  interactionId?: string;
  uppercaseStatus?: string;
  notes?: string;
  evidenceSourceId?: string
} {
  if (typeof body !== "object" || body === null) {
    return { errorResponse: jsonNoStore({ error: "Geçersiz istek formatı." }, 400) };
  }

  const { interactionId, status, notes, evidenceSourceId } = body as Record<string, unknown>;

  if (typeof interactionId !== "string" || !interactionId || typeof status !== "string" || !status) {
    return { errorResponse: jsonNoStore({ error: "interactionId ve status parametreleri zorunludur." }, 400) };
  }




  const notesStr = typeof notes === "string" ? notes : undefined;
  const evidenceSourceIdStr = typeof evidenceSourceId === "string" ? evidenceSourceId : undefined;

  const uppercaseStatus = status.toUpperCase();
  if (uppercaseStatus !== "VERIFIED" && uppercaseStatus !== "PENDING" && uppercaseStatus !== "DEPRECATED") {
    return { errorResponse: jsonNoStore({ error: "Geçersiz durum değeri. (VERIFIED, PENDING veya DEPRECATED olmalıdır)" }, 400) };
  }

  return { interactionId, uppercaseStatus, notes: notesStr, evidenceSourceId: evidenceSourceIdStr };
}

async function processReview(
  interactionId: string,
  uppercaseStatus: string,
  notes: string | undefined,
  evidenceSourceId: string | undefined,
  session: SessionData
): Promise<{ errorResponse?: NextResponse; updatedInteraction?: DrugInteraction; review?: ClinicalReview }> {
  const interaction = await prisma.drugInteraction.findUnique({
    where: { id: interactionId },
  });

  if (!interaction) {
    return { errorResponse: jsonNoStore({ error: "Belirtilen ilaç etkileşimi bulunamadı." }, 404) };
  }

  const [updatedInteraction, review] = await prisma.$transaction([
    prisma.drugInteraction.update({
      where: { id: interactionId },
      data: {
        verificationStatus: uppercaseStatus as Status,
      },
    }),
    prisma.clinicalReview.create({
      data: {
        entityType: "DrugInteraction",
        entityId: interactionId,
        reviewerRole: "CLINICAL_REVIEWER",
        reviewerId: session.userId,
        decision: uppercaseStatus,
        notes: notes || null,
        evidenceSourceId: evidenceSourceId || null,
      },
    }),
  ]);

  await writeAuditLog({
    eventType: "CLINICAL_REVIEW_UPDATE",
    entityType: "DrugInteraction",
    entityId: interactionId,
    userId: session.userId,
    details: `User ${session.email} updated verification status of interaction ${interactionId} to ${uppercaseStatus}. Notes: ${notes || "None"}`,
  });

  return { updatedInteraction, review };
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await checkAuthorization(request);
    if (authResult.errorResponse) return authResult.errorResponse;
    const session = authResult.session!;

    const body = await request.json();
    const inputResult = validateInput(body);
    if (inputResult.errorResponse) return inputResult.errorResponse;

    const { interactionId, uppercaseStatus, notes, evidenceSourceId } = inputResult;

    const processResult = await processReview(interactionId!, uppercaseStatus!, notes, evidenceSourceId, session);
    if (processResult.errorResponse) return processResult.errorResponse;

    return jsonNoStore({
      success: true,
      interaction: processResult.updatedInteraction,
      review: processResult.review,
    });
  } catch (error) {
    Sentry.captureException(error);
    return jsonNoStore(
      { error: "Onay durumu güncellenirken sistemsel bir hata oluştu." },
      500
    );
  }
}
