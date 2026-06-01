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

describe("POST /api/auth/register (Security - No Enumeration)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return a generic success message even if the user already exists (preventing enumeration and ID disclosure)", async () => {
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

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Kayıt işlemi başarılı. Lütfen e-postanızı kontrol edin.");
    expect(data.user).toBeUndefined(); // Should not return user object
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
    expect(data.message).toBe("Kayıt işlemi başarılı. Lütfen e-postanızı kontrol edin.");
    expect(data.user).toBeUndefined(); // Should not return user object
    expect(prisma.user.create).toHaveBeenCalled();
  });
});
