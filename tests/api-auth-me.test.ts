import { NextRequest } from "next/server";
import { GET } from "@/app/api/auth/me/route";
import { getSession } from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  getSession: jest.fn(),
}));

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 when no session exists", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);

    const req = {
      method: "GET",
    } as unknown as NextRequest;

    const res = await GET(req);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json).toEqual({ authenticated: false });
  });

  it("should return 200 and user details when valid session exists", async () => {
    const mockSession = {
      userId: "user-123",
      email: "test@example.com",
      expires: Date.now() + 10000,
    };
    (getSession as jest.Mock).mockResolvedValue(mockSession);

    const req = {
      method: "GET",
    } as unknown as NextRequest;

    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({
      authenticated: true,
      user: {
        id: mockSession.userId,
        email: mockSession.email,
      },
    });
  });

  it("should return 401 when session is expired or invalid (getSession returns null)", async () => {
    // If session is expired, getSession itself handles returning null based on our lib/auth.ts implementation
    (getSession as jest.Mock).mockResolvedValue(null);

    const req = {
      method: "GET",
    } as unknown as NextRequest;

    const res = await GET(req);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json).toEqual({ authenticated: false });
  });
});
