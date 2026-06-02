/** @jest-environment node */
import { POST } from "../app/api/auth/logout/route";

describe("POST /api/auth/logout", () => {
  it("should return success and clear the session cookie", async () => {
    const res = await POST();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);

    const cookies = res.headers.get("set-cookie");
    expect(cookies).toBeDefined();
    expect(cookies).toContain("session=;");
    expect(cookies).toContain("Path=/");
    expect(cookies).toContain("HttpOnly");
    expect(cookies).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  });
});
