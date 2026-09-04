import { GET as getMedications, clearDrugsListCache } from "@/app/api/fhir/medication/route";
import { POST as processMedicationRequest } from "@/app/api/fhir/medicationrequest/route";
import { POST as createShare } from "@/app/api/pillbox/share/route";
import { GET as getShare } from "@/app/api/pillbox/share/[token]/route";
import { POST as submitReview } from "@/app/api/admin/review/route";
import { NextRequest } from "next/server";
import { getSession, verifyCSRF } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import {
  findInteractionsDB,
  checkAccumulationDB,
  findFoodInteractionsDB,
  findContraindicationsDB,
  resolveDrugsDB
} from "@/lib/interactions";

// Mock dependencies
jest.mock("@/lib/auth", () => ({
  getSession: jest.fn(),
  verifyCSRF: jest.fn().mockReturnValue(true),
}));

jest.mock("@/lib/redis", () => ({
  redis: null,
}));

jest.mock("@/lib/audit", () => ({
  writeAuditLog: jest.fn().mockResolvedValue({ id: "audit-1" }),
}));

jest.mock("@/lib/interactions", () => ({
  findInteractionsDB: jest.fn(),
  checkAccumulationDB: jest.fn(),
  findFoodInteractionsDB: jest.fn(),
  findContraindicationsDB: jest.fn(),
  resolveDrugsDB: jest.fn().mockResolvedValue([{ id: "aspirin", name: "Aspirin" }]),
  getAllDrugs: jest.fn().mockReturnValue([
    { id: "aspirin", name: "Aspirin", activeIngredient: "Aspirin", category: "Analjezik" }
  ]),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
    user: {
      findUnique: jest.fn(),
    },
    drug: {
      findMany: jest.fn(),
    },
    drugInteraction: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    clinicalReview: {
      create: jest.fn(),
    },
    pillboxShare: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

describe("PillMind 3.0 Enterprise and FHIR API Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: Record<string, any> | null, method = "POST", url = "http://localhost:3000") => {
    const req = new Request(url, { method, body: body && (method === "POST" || method === "PUT" || method === "PATCH") ? JSON.stringify(body) : undefined }) as any;
    req.cookies = {
      get: jest.fn().mockReturnValue({ value: "mock-session-cookie" }),
    };
    req.json = jest.fn().mockResolvedValue(body);
    req.nextUrl = new URL(url);
    return req;
  };

  describe("HL7 FHIR Medication (GET /api/fhir/medication)", () => {
    beforeEach(() => {
      clearDrugsListCache();
      (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "test@pillmind.com" });
      (verifyCSRF as jest.Mock).mockReturnValue(true);
    });
    it("should map drugs to FHIR Medication resources with RxNorm/ATC codes", async () => {
      const mockDrugs = [
        {
          id: "aspirin-id",
          name: "Aspirin",
          activeIngredient: "Aspirin Sodyum",
          category: "NSAID",
          rxcui: "1191",
          ingredient: {
            atcCode: "N02BA01",
          },
        },
      ];
      (prisma.drug.findMany as jest.Mock).mockResolvedValue(mockDrugs);

      const res = await getMedications(createMockRequest(null, "GET", "http://localhost/api/fhir/medication"));
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.resourceType).toBe("Bundle");
      expect(body.entry).toHaveLength(1);
      
      const resource = body.entry[0].resource;
      expect(resource.resourceType).toBe("Medication");
      expect(resource.id).toBe("aspirin-id");
      expect(resource.code.text).toBe("Aspirin");
      
      const codings = resource.code.coding;
      expect(codings).toContainEqual({
        system: "http://www.nlm.nih.gov/research/umls/rxnorm",
        code: "1191",
        display: "Aspirin",
      });
      expect(codings).toContainEqual({
        system: "http://www.whocc.no/atc",
        code: "N02BA01",
        display: "Aspirin Sodyum",
      });
    });
  });

  describe("HL7 FHIR MedicationRequest (POST /api/fhir/medicationrequest)", () => {
    beforeEach(() => {
      (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "test@test.com" });
    });

    it("should process FHIR Parameters payload and return interaction counts", async () => {
      const fhirPayload = {
        resourceType: "Parameters",
        parameter: [
          { name: "medications", valueString: "aspirin, warfarin" },
          { name: "patientContext", valueString: '{"isPregnant":false}' }
        ],
      };

      (findInteractionsDB as jest.Mock).mockResolvedValue([{ id: "int-1" }]);
      (checkAccumulationDB as jest.Mock).mockResolvedValue([]);
      (findFoodInteractionsDB as jest.Mock).mockResolvedValue([]);
      (findContraindicationsDB as jest.Mock).mockResolvedValue([]);

      const req = createMockRequest(fhirPayload);
      const res = await processMedicationRequest(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.resourceType).toBe("Parameters");
      expect(body.parameter).toContainEqual({
        name: "interactionsCount",
        valueInteger: 1,
      });
    });

    it("should return OperationOutcome 400 if less than 2 drugs are provided", async () => {
      const fhirPayload = {
        resourceType: "Parameters",
        parameter: [
          { name: "medications", valueString: "aspirin" }
        ],
      };

      const req = createMockRequest(fhirPayload);
      const res = await processMedicationRequest(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.resourceType).toBe("OperationOutcome");
      expect(body.issue[0].diagnostics).toContain("En az 2 MedicationRequest");
    });
  });

  describe("Pillbox Share POST (/api/pillbox/share)", () => {
    it("should require authentication to create a share", async () => {
      (getSession as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({ drugIds: ["aspirin", "warfarin"] });
      const res = await createShare(req);
      expect(res.status).toBe(401);
    });

    it("should generate a 24h expiration token and save to PillboxShare", async () => {
      (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "dr@pillmind.com" });
      const mockShare = { id: "share-123", token: "f615f265e2a1af0faf79a0afbd9e1775eab9aba43ccb9c5be359bc4567862994", drugIds: ["aspirin", "warfarin"], expiresAt: new Date(Date.now() + 86400000) };
      (prisma.pillboxShare.create as jest.Mock).mockResolvedValue(mockShare);

      const req = createMockRequest({ drugIds: ["aspirin", "warfarin"], summary: { note: "test" } });
      const res = await createShare(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      // For the enterprise test, since we don't mock crypto here, the returned token will be random bytes.
      expect(body.token).toBeDefined();
      expect(body.shareUrl).toBeDefined();
      expect(body.shareUrl).toContain("/share/");
      expect(prisma.pillboxShare.create).toHaveBeenCalled();
      expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        eventType: "SHARE_CREATED",
        userId: "user-1"
      }));
    });
  });

  describe("Pillbox Share GET (/api/pillbox/share/[token])", () => {
    const createMockRouteParams = (token: string) => {
      return {
        params: Promise.resolve({ token })
      };
    };

    it("should return 404 if the share token does not exist", async () => {
      (prisma.pillboxShare.findUnique as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest(null, "GET", "http://localhost:3000/api/pillbox/share/invalidtoken");
      const res = await getShare(req, createMockRouteParams("invalidtoken"));
      expect(res.status).toBe(404);
    });

    it("should return 410 Gone if the share token has expired", async () => {
      const mockExpiredShare = {
        token: "92da5359b7aa17ad707d6b68c0dfbdec2b4a42a8ce2c3318f897438470b3325f",
        drugIds: ["aspirin"],
        expiresAt: new Date(Date.now() - 10000), // 10s ago
      };
      (prisma.pillboxShare.findUnique as jest.Mock).mockResolvedValue(mockExpiredShare);

      const req = createMockRequest(null, "GET", "http://localhost:3000/api/pillbox/share/expired123");
      const res = await getShare(req, createMockRouteParams("expired123"));
      expect(res.status).toBe(410);
    });

    it("should return read-only report details if token is valid", async () => {
      (resolveDrugsDB as jest.Mock).mockResolvedValue([
        { id: "aspirin", name: "Aspirin" },
        { id: "warfarin", name: "Warfarin" },
      ]);
      const mockValidShare = {
        token: "54b4b82acae316adc3f4d19bd7077bcedd66aeff3c61fd13d719e6f535550678",
        drugIds: ["aspirin", "warfarin"],
        expiresAt: new Date(Date.now() + 100000),
        createdAt: new Date(),
      };
      (prisma.pillboxShare.findUnique as jest.Mock).mockResolvedValue(mockValidShare);
      (prisma.drug.findMany as jest.Mock).mockResolvedValue([
        { id: "aspirin", name: "Aspirin" },
        { id: "warfarin", name: "Warfarin" },
      ]);
      (findInteractionsDB as jest.Mock).mockResolvedValue([]);

      const req = createMockRequest(null, "GET", "http://localhost:3000/api/pillbox/share/valid123");
      const res = await getShare(req, createMockRouteParams("valid123"));
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.drugIds).toEqual(["aspirin", "warfarin"]);
      expect(body.drugs).toHaveLength(2);
    });
  });

  describe("Clinical Approval (POST /api/admin/review)", () => {
    it("should return 401 if admin reviewer is not authenticated", async () => {
      (getSession as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({ interactionId: "int-1", status: "VERIFIED" });
      const res = await submitReview(req);
      expect(res.status).toBe(401);
    });

    it("should return 403 if the authenticated user is not an authorized reviewer", async () => {
      (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "hasta@pillmind.com" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: "USER" });

      const req = createMockRequest({ interactionId: "int-1", status: "VERIFIED" });
      const res = await submitReview(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Klinik onay işlemi için yetkiniz bulunmamaktadır.");
    });

    it("should update status, create clinical review record, and log action", async () => {
      (getSession as jest.Mock).mockResolvedValue({ userId: "admin-1", email: "admin@pillmind.com" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: "ADMIN" });
      (prisma.drugInteraction.findUnique as jest.Mock).mockResolvedValue({ id: "int-1", severity: "high" });
      (prisma.drugInteraction.update as jest.Mock).mockResolvedValue({ id: "int-1", verificationStatus: "VERIFIED" });
      (prisma.clinicalReview.create as jest.Mock).mockResolvedValue({ id: "rev-1", entityId: "int-1" });

      const req = createMockRequest({
        interactionId: "int-1",
        status: "VERIFIED",
        notes: "Clinical check passed."
      });
      const res = await submitReview(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.interaction.verificationStatus).toBe("VERIFIED");
      expect(prisma.drugInteraction.update).toHaveBeenCalledWith({
        where: { id: "int-1" },
        data: { verificationStatus: "VERIFIED" }
      });
      expect(prisma.clinicalReview.create).toHaveBeenCalled();
      expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        eventType: "CLINICAL_REVIEW_UPDATE"
      }));
    });
  });
});
