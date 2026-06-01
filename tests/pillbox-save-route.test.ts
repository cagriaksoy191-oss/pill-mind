/** @jest-environment node */
import { POST } from "../app/api/pillbox/save/route";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

jest.mock("@/lib/auth", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    savedPillbox: {
      create: jest.fn(),
    },
  },
}));

describe("POST /api/pillbox/save", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (body: unknown) => {
    return new NextRequest("http://localhost/api/pillbox/save", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
  };

  it("should return 401 if user is not authenticated", async () => {
    (getSession as jest.Mock).mockReturnValue(null);

    const req = createRequest({ name: "My Pillbox", drugIds: ["drug-1"] });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe(
      "İlaç kutunuzu buluta kaydetmek için lütfen önce giriş yapın.",
    );
  });

  it("should return 400 if name is missing or empty", async () => {
    (getSession as jest.Mock).mockReturnValue({ userId: "user-1" });

    const req = createRequest({ name: "   ", drugIds: ["drug-1"] });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Kutu ismi ve en az 1 ilaç seçimi zorunludur.");
  });

  it("should return 400 if drugIds is missing, empty, or not an array", async () => {
    (getSession as jest.Mock).mockReturnValue({ userId: "user-1" });

    const req1 = createRequest({ name: "My Pillbox" });
    const res1 = await POST(req1);
    expect(res1.status).toBe(400);

    const req2 = createRequest({ name: "My Pillbox", drugIds: [] });
    const res2 = await POST(req2);
    expect(res2.status).toBe(400);

    const req3 = createRequest({ name: "My Pillbox", drugIds: "not-an-array" });
    const res3 = await POST(req3);
    expect(res3.status).toBe(400);
  });

  it("should return 200 and save pillbox if data is valid", async () => {
    (getSession as jest.Mock).mockReturnValue({ userId: "user-1" });
    (prisma.savedPillbox.create as jest.Mock).mockResolvedValue({
      id: "pillbox-1",
      userId: "user-1",
      name: "My Pillbox",
      drugIds: ["drug-1", "drug-2"],
    });

    const req = createRequest({
      name: "  My Pillbox  ",
      drugIds: ["drug-1", "drug-2"],
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.pillbox.id).toBe("pillbox-1");

    expect(prisma.savedPillbox.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        name: "My Pillbox",
        drugIds: ["drug-1", "drug-2"],
      },
    });
  });

  it("should return 500 if database creation fails", async () => {
    (getSession as jest.Mock).mockReturnValue({ userId: "user-1" });
    (prisma.savedPillbox.create as jest.Mock).mockRejectedValue(
      new Error("DB error"),
    );

    const req = createRequest({ name: "My Pillbox", drugIds: ["drug-1"] });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe(
      "İlaç kutusu kaydedilirken sistemsel bir hata oluştu.",
    );
  });
});
