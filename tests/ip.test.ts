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

  describe("Next.js explicit request.ip property", () => {
    it.each([
      ["standard IP", "1.2.3.4", "1.2.3.4"],
      ["IP with whitespace", "   192.168.1.1   ", "192.168.1.1"],
      ["IPv6 address", "2001:db8::1", "2001:db8::1"],
    ])("should return trimmed IP when request.ip is %s", (_, inputIp, expectedIp) => {
      const req = new Request("http://localhost") as Request & { ip?: string };
      req.ip = inputIp;
      expect(getClientIp(req)).toBe(expectedIp);
    });

    it("should take precedence over Vercel and Netlify environment headers", () => {
      process.env.VERCEL = "1";
      process.env.NETLIFY = "true";
      const req = new Request("http://localhost", {
        headers: {
          "x-vercel-forwarded-for": "10.0.0.1",
          "x-nf-client-connection-ip": "10.0.0.2",
        },
      }) as Request & { ip?: string };
      req.ip = "8.8.8.8";

      expect(getClientIp(req)).toBe("8.8.8.8");
    });

    it.each([
      ["empty string", ""],
      ["whitespace-only string", "   "],
      ["non-string type (number)", 12345],
      ["non-string type (boolean)", true],
      ["null value", null],
    ])("should fall through when request.ip is %s", (_, invalidIp) => {
      const req = new Request("http://localhost") as Request & { ip?: unknown };
      req.ip = invalidIp;
      expect(getClientIp(req)).toBe("127.0.0.1");
    });
  });

  describe("Vercel platform headers (process.env.VERCEL)", () => {
    beforeEach(() => {
      process.env.VERCEL = "1";
    });

    it.each([
      ["single IP", "1.2.3.4", "1.2.3.4"],
      ["multiple IPs (extract rightmost client IP)", "1.2.3.4, 5.6.7.8, 11.22.33.44", "11.22.33.44"],
      ["multiple IPs with irregular whitespace", "1.2.3.4 ,  11.22.33.44  ", "11.22.33.44"],
    ])("should extract real client IP for %s", (_, headerVal, expectedIp) => {
      const req = new Request("http://localhost", {
        headers: {
          "x-vercel-forwarded-for": headerVal,
          "x-forwarded-for": "9.9.9.9",
        },
      });
      expect(getClientIp(req)).toBe(expectedIp);
    });

    it("should take precedence over Netlify headers when VERCEL env is set", () => {
      process.env.NETLIFY = "true";
      const req = new Request("http://localhost", {
        headers: {
          "x-vercel-forwarded-for": "11.22.33.44",
          "x-nf-client-connection-ip": "55.66.77.88",
        },
      });
      expect(getClientIp(req)).toBe("11.22.33.44");
    });

    it("should ignore x-vercel-forwarded-for header when VERCEL env is NOT set", () => {
      delete process.env.VERCEL;
      const req = new Request("http://localhost", {
        headers: {
          "x-vercel-forwarded-for": "11.22.33.44",
        },
      });
      expect(getClientIp(req)).toBe("127.0.0.1");
    });

    it("should fall back to 127.0.0.1 when header is whitespace-only", () => {
      const req = new Request("http://localhost", {
        headers: {
          "x-vercel-forwarded-for": "   ",
        },
      });
      expect(getClientIp(req)).toBe("127.0.0.1");
    });
  });

  describe("Netlify platform headers (process.env.NETLIFY)", () => {
    beforeEach(() => {
      delete process.env.VERCEL;
      process.env.NETLIFY = "true";
    });

    it.each([
      ["single IP", "1.2.3.4", "1.2.3.4"],
      ["multiple IPs (extract rightmost client IP)", "1.2.3.4, 55.66.77.88", "55.66.77.88"],
      ["multiple IPs with irregular whitespace", "1.2.3.4 ,  55.66.77.88  ", "55.66.77.88"],
    ])("should extract real client IP for %s", (_, headerVal, expectedIp) => {
      const req = new Request("http://localhost", {
        headers: {
          "x-nf-client-connection-ip": headerVal,
          "x-forwarded-for": "9.9.9.9",
        },
      });
      expect(getClientIp(req)).toBe(expectedIp);
    });

    it("should ignore x-nf-client-connection-ip header when NETLIFY env is NOT set", () => {
      delete process.env.NETLIFY;
      const req = new Request("http://localhost", {
        headers: {
          "x-nf-client-connection-ip": "55.66.77.88",
        },
      });
      expect(getClientIp(req)).toBe("127.0.0.1");
    });

    it("should fall back to 127.0.0.1 when header is whitespace-only", () => {
      const req = new Request("http://localhost", {
        headers: {
          "x-nf-client-connection-ip": "   ",
        },
      });
      expect(getClientIp(req)).toBe("127.0.0.1");
    });
  });

  describe("Fallback behavior", () => {
    it("should return 127.0.0.1 when no relevant headers or env vars are present", () => {
      delete process.env.VERCEL;
      delete process.env.NETLIFY;
      const req = new Request("http://localhost");
      expect(getClientIp(req)).toBe("127.0.0.1");
    });

    it("should return 127.0.0.1 when only untrusted x-forwarded-for header is present", () => {
      delete process.env.VERCEL;
      delete process.env.NETLIFY;
      const req = new Request("http://localhost", {
        headers: {
          "x-forwarded-for": "9.9.9.9, 8.8.8.8",
        },
      });
      expect(getClientIp(req)).toBe("127.0.0.1");
    });
  });
});
