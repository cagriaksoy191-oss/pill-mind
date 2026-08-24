import { getClientIp } from "../lib/ip";

describe("getClientIp", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should return 127.0.0.1 when no headers are present", () => {
    const req = new Request("http://localhost");
    expect(getClientIp(req)).toBe("127.0.0.1");
  });

  it("should return 127.0.0.1 when only untrusted headers like x-forwarded-for are present", () => {
    const req = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "9.9.9.9",
      },
    });
    expect(getClientIp(req)).toBe("127.0.0.1");
  });

  it("should extract IP from x-vercel-forwarded-for header when VERCEL env is set", () => {
    process.env.VERCEL = "1";
    const req = new Request("http://localhost", {
      headers: {
        "x-vercel-forwarded-for": "1.2.3.4, 11.22.33.44",
        "x-forwarded-for": "1.2.3.4, 5.6.7.8",
      },
    });
    expect(getClientIp(req)).toBe("11.22.33.44");
  });

  it("should ignore x-vercel-forwarded-for header when VERCEL env is NOT set", () => {
    delete process.env.VERCEL;
    const req = new Request("http://localhost", {
      headers: {
        "x-vercel-forwarded-for": "11.22.33.44",
        "x-forwarded-for": "1.2.3.4, 5.6.7.8",
      },
    });
    expect(getClientIp(req)).toBe("127.0.0.1");
  });

  it("should extract IP from x-nf-client-connection-ip header when NETLIFY env is set", () => {
    process.env.NETLIFY = "true";
    const req = new Request("http://localhost", {
      headers: {
        "x-nf-client-connection-ip": "1.2.3.4, 55.66.77.88",
        "x-forwarded-for": "1.2.3.4, 5.6.7.8",
      },
    });
    expect(getClientIp(req)).toBe("55.66.77.88");
  });

  it("should ignore x-nf-client-connection-ip header when NETLIFY env is NOT set", () => {
    delete process.env.NETLIFY;
    const req = new Request("http://localhost", {
      headers: {
        "x-nf-client-connection-ip": "55.66.77.88",
        "x-forwarded-for": "1.2.3.4, 5.6.7.8",
      },
    });
    expect(getClientIp(req)).toBe("127.0.0.1");
  });

  it("should extract IP from Next.js explicit `ip` property if present", () => {
    const req = new Request("http://localhost") as Request & { ip?: string };
    req.ip = "8.8.8.8";
    expect(getClientIp(req)).toBe("8.8.8.8");
  });

  it("should handle empty or whitespace-only platform headers gracefully by falling back to 127.0.0.1", () => {
    process.env.VERCEL = "1";
    const req = new Request("http://localhost", {
      headers: {
        "x-vercel-forwarded-for": "   ",
      },
    });
    expect(getClientIp(req)).toBe("127.0.0.1");
  });
});
