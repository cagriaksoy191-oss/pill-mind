import { POST } from "@/app/api/auth/logout/route";
import { verifyCSRF } from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  verifyCSRF: jest.fn(),
}));

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 403 if CSRF validation fails", async () => {
    (verifyCSRF as jest.Mock).mockReturnValue(false);

    const req = {
      headers: new Headers(),
    } as unknown as Request;

    const res = await POST(req);

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Güvenlik doğrulaması başarısız oldu (CSRF engellendi).");
  });

  it("should successfully log out if CSRF validation succeeds", async () => {
    (verifyCSRF as jest.Mock).mockReturnValue(true);

    const req = {
      headers: new Headers(),
    } as unknown as Request;

    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    const cookieHeader = res.headers.get("set-cookie");
    expect(cookieHeader).toBeDefined();
    expect(cookieHeader).toContain("session=;");
    expect(cookieHeader).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT;");
    expect(cookieHeader).toContain("Path=/;");
    expect(cookieHeader).toContain("HttpOnly");
  });
});
