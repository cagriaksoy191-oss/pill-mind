export function getClientIp(request: Request): string {
  // 1. Check for Next.js explicit `ip` property (e.g. Edge environments)
  if ("ip" in request && typeof request.ip === "string" && request.ip.trim()) {
    return request.ip.trim();
  }

  // 2. Check for trusted platform-specific headers that cannot be spoofed
  if (process.env.VERCEL) {
    const vercelIp = request.headers.get("x-vercel-forwarded-for");
    if (vercelIp) {
      // Vercel appends the real client IP to the end of the header
      const clientIp = vercelIp.split(",").pop()?.trim();
      if (clientIp) {
        return clientIp;
      }
    }
  }

  if (process.env.NETLIFY) {
    const netlifyIp = request.headers.get("x-nf-client-connection-ip");
    if (netlifyIp) {
      const clientIp = netlifyIp.split(",").pop()?.trim();
      if (clientIp) {
        return clientIp;
      }
    }
  }

  // 3. Default fallback
  return "127.0.0.1";
}
