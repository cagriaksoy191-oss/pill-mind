/** @jest-environment node */
import { POST } from "../app/api/pillbox/delete/route";
import * as auth from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

jest.mock("@/lib/auth", () => {
  const originalModule = jest.requireActual("@/lib/auth");
  return {
    __esModule: true,
    ...originalModule,
    getSession: jest.fn(),
  };
});

jest.mock("@/lib/prisma", () => ({
  prisma: {
    savedPillbox: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe("POST /api/pillbox/delete", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (body: unknown) => {
    return new NextRequest("http://localhost/api/pillbox/delete", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
  };

  it("should return 401 if user is not authenticated", async () => {
    (auth.getSession as jest.Mock).mockReturnValue(null);
    const req = createRequest({ id: "pillbox-1" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe(
      "Kutu silme yetkiniz bulunmuyor. Lütfen önce giriş yapın.",
    );
  });

  it("should return 400 if id is missing", async () => {
    (auth.getSession as jest.Mock).mockReturnValue({ userId: "user-1" });
    const req = createRequest({});
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Silinecek kutunun kimliği (ID) gereklidir.");
  });

  it("should return 404 if pillbox does not exist", async () => {
    (auth.getSession as jest.Mock).mockReturnValue({ userId: "user-1" });
    (prisma.savedPillbox.findUnique as jest.Mock).mockResolvedValue(null);

    const req = createRequest({ id: "non-existent-id" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe(
      "Silinecek kayıt bulunamadı veya silme yetkiniz yok.",
    );
  });

  it("should return 404 if pillbox belongs to a different user", async () => {
    (auth.getSession as jest.Mock).mockReturnValue({ userId: "user-1" });
    (prisma.savedPillbox.findUnique as jest.Mock).mockResolvedValue({
      id: "pillbox-1",
      userId: "user-2", // different user
    });

    const req = createRequest({ id: "pillbox-1" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe(
      "Silinecek kayıt bulunamadı veya silme yetkiniz yok.",
    );
  });

  it("should return 200 and delete pillbox if valid", async () => {
    (auth.getSession as jest.Mock).mockReturnValue({ userId: "user-1" });
    (prisma.savedPillbox.findUnique as jest.Mock).mockResolvedValue({
      id: "pillbox-1",
      userId: "user-1",
    });
    (prisma.savedPillbox.delete as jest.Mock).mockResolvedValue({});

    const req = createRequest({ id: "pillbox-1" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.savedPillbox.delete).toHaveBeenCalledWith({
      where: { id: "pillbox-1" },
    });
  });

  it("should return 500 if database deletion fails", async () => {
    (auth.getSession as jest.Mock).mockReturnValue({ userId: "user-1" });
    (prisma.savedPillbox.findUnique as jest.Mock).mockResolvedValue({
      id: "pillbox-1",
      userId: "user-1",
    });
    (prisma.savedPillbox.delete as jest.Mock).mockRejectedValue(
      new Error("DB error"),
    );

    const req = createRequest({ id: "pillbox-1" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe(
      "İlaç kutusu silinirken sistemsel bir hata oluştu.",
    );
  });
});
