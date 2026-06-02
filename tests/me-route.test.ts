/** @jest-environment node */
import { GET } from "../app/api/auth/me/route";
import { getSession } from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  getSession: jest.fn(),
}));

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if session is invalid or missing", async () => {
    (getSession as jest.Mock).mockReturnValue(null);

    const req = new Request("http://localhost/api/auth/me", {
      method: "GET",
    });

    const res = await GET(req as unknown as import("next/server").NextRequest);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ authenticated: false });
    expect(getSession).toHaveBeenCalledWith(req);
  });

  it("should return 200 and user data if session is valid", async () => {
    const mockSession = {
      userId: "test-user-id",
      email: "test@example.com",
    };
    (getSession as jest.Mock).mockReturnValue(mockSession);

    const req = new Request("http://localhost/api/auth/me", {
      method: "GET",
    });

    const res = await GET(req as unknown as import("next/server").NextRequest);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      authenticated: true,
      user: {
        id: "test-user-id",
        email: "test@example.com",
      },
    });
    expect(getSession).toHaveBeenCalledWith(req);
  });
});
