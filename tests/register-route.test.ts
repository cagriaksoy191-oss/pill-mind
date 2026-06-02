/** @jest-environment node */
import { POST } from "../app/api/auth/register/route";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 if the user already exists (duplicate email)", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      id: "existing-user-id",
      email: "test@example.com",
    });

    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Bu e-posta adresi zaten kullanılıyor");
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("should create a new user and return a generic success message if the user does not exist", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
    (prisma.user.create as jest.Mock).mockResolvedValueOnce({
      id: "new-user-id",
      email: "new@example.com",
    });

    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "new@example.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe(
      "Kayıt işlemi başarılı. Lütfen e-postanızı kontrol edin.",
    );
    expect(data.user).toBeUndefined(); // Should not return user object
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it("should handle system errors gracefully and return a 500 status", async () => {
    // Suppress console.error for this test
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Force Prisma to throw an error
    (prisma.user.findUnique as jest.Mock).mockRejectedValueOnce(
      new Error("Database connection failed"),
    );

    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "error@example.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Kayıt sırasında sistemsel bir hata oluştu.");
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should return 400 if email is missing from the payload", async () => {
    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Geçersiz bir e-posta adresi girdiniz.");
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("should return 400 if email is invalid (missing @)", async () => {
    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "invalidemail.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Geçersiz bir e-posta adresi girdiniz.");
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
