import { POST } from "../app/api/auth/login/route";

jest.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from "../lib/prisma";

jest.mock("../lib/auth", () => ({
  encryptSession: jest.fn(),
}));

import { encryptSession } from "../lib/auth";

describe("Login route test", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 500 when an error is thrown", async () => {
    (prisma.user.findUnique as jest.Mock).mockRejectedValue(
      new Error("Database error"),
    );

    (encryptSession as jest.Mock).mockImplementation(() => {
      throw new Error("Simulated system error");
    });

    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const res = await POST(request);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Giriş yapılırken sistemsel bir hata oluştu.");

    consoleSpy.mockRestore();
  });
});
