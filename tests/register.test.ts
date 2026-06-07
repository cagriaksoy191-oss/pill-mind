import { POST } from "../app/api/auth/register/route";

// mock the entire module before any other tests or assertions
jest.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { prisma } from "../lib/prisma";

describe("Register route test", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should register successfully", async () => {
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: "1",
      email: "test@example.com",
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const res = await POST(request);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user.email).toBe("test@example.com");
  });

  it("should fail when user already exists", async () => {
    const error: any = new Error();
    error.code = "P2002";
    (prisma.user.create as jest.Mock).mockRejectedValue(error);

    const request = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const res = await POST(request);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe(
      "Bu e-posta adresiyle kayıtlı bir kullanıcı zaten mevcut.",
    );
  });

  it("should return 500 when a system error occurs during registration", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const error = new Error("Generic database error");
    (prisma.user.create as jest.Mock).mockRejectedValue(error);

    const request = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ email: "error@example.com" }),
    });

    const res = await POST(request);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Kayıt sırasında sistemsel bir hata oluştu.");

    consoleSpy.mockRestore();
  });
});
