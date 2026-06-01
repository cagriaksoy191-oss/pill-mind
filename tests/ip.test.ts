import { getClientIp } from "../lib/ip";

describe("getClientIp", () => {
  it("should return 127.0.0.1 when no headers are present", () => {
    const req = new Request("http://localhost");
    expect(getClientIp(req)).toBe("127.0.0.1");
  });

  it("should extract IP from x-vercel-forwarded-for header", () => {
    const req = new Request("http://localhost", {
      headers: {
        "x-vercel-forwarded-for": "11.22.33.44",
        "x-forwarded-for": "1.2.3.4, 5.6.7.8", // Should be ignored in favor of vercel header
      },
    });
    expect(getClientIp(req)).toBe("11.22.33.44");
  });

  it("should extract IP from x-nf-client-connection-ip header", () => {
    const req = new Request("http://localhost", {
      headers: {
        "x-nf-client-connection-ip": "55.66.77.88",
        "x-forwarded-for": "1.2.3.4, 5.6.7.8", // Should be ignored
      },
    });
    expect(getClientIp(req)).toBe("55.66.77.88");
  });

  it("should extract the right-most IP from x-forwarded-for list when no platform header is present", () => {
    const req = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.10.11.12",
      },
    });
    // The attacker spoofs 1.2.3.4 and 5.6.7.8, our trusted proxy appends 9.10.11.12
    expect(getClientIp(req)).toBe("9.10.11.12");
  });

  it("should extract the single IP from x-forwarded-for", () => {
    const req = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "100.100.100.100",
      },
    });
    expect(getClientIp(req)).toBe("100.100.100.100");
  });

  it("should extract IP from Next.js explicit `ip` property if present", () => {
    const req = new Request("http://localhost") as Request & { ip?: string };
    req.ip = "8.8.8.8";
    expect(getClientIp(req)).toBe("8.8.8.8");
  });
});
