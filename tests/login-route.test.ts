/** @jest-environment node */
import { POST } from "../app/api/auth/login/route";
import { prisma } from "@/lib/prisma";
import { encryptSession } from "@/lib/auth";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  encryptSession: jest.fn(),
}));

describe("POST /api/auth/login (Auth Endpoint Tests)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should log in an existing user and set a session cookie", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      id: "existing-user-id",
      email: "test@example.com",
    });

    (encryptSession as jest.Mock).mockReturnValueOnce("mocked-session-token");

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user).toEqual({
      id: "existing-user-id",
      email: "test@example.com",
    });

    expect(encryptSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "existing-user-id",
        email: "test@example.com",
        expires: expect.any(Number),
      }),
    );

    const cookies = res.headers.get("set-cookie");
    expect(cookies).toContain("session=mocked-session-token; Path=/;");
    expect(cookies).toContain("HttpOnly; SameSite=lax");
  });

  it("should create a new user (Magic Link simulation) if user does not exist", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
    (prisma.user.create as jest.Mock).mockResolvedValueOnce({
      id: "new-user-id",
      email: "new@example.com",
    });

    (encryptSession as jest.Mock).mockReturnValueOnce("mocked-session-token");

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "new@example.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user).toEqual({
      id: "new-user-id",
      email: "new@example.com",
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email: "new@example.com" },
    });

    expect(encryptSession).toHaveBeenCalled();
  });

  it("should return 400 if email is missing", async () => {
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Geçersiz bir e-posta adresi girdiniz.");
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("should return 400 if email is invalid (missing @)", async () => {
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "invalidemail.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Geçersiz bir e-posta adresi girdiniz.");
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
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

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "error@example.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Giriş yapılırken sistemsel bir hata oluştu.");
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should handle invalid JSON body and return a 500 status", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Create a request with an invalid JSON body that will throw when .json() is called
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: "this is not valid json",
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Giriş yapılırken sistemsel bir hata oluştu.");
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should handle error when prisma.user.create fails", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
    (prisma.user.create as jest.Mock).mockRejectedValueOnce(
      new Error("Create failed"),
    );

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "error_create@example.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Giriş yapılırken sistemsel bir hata oluştu.");
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should handle error when encryptSession fails", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      id: "existing-user-id",
      email: "test@example.com",
    });

    (encryptSession as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Encryption failed");
    });

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Giriş yapılırken sistemsel bir hata oluştu.");
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
