export function getClientIp(request: Request): string {
  // 1. Check for Next.js explicit `ip` property (e.g. Edge environments)
  if ("ip" in request && typeof request.ip === "string" && request.ip) {
    return request.ip;
  }

  // 2. Check for trusted platform-specific headers that cannot be spoofed
  if (process.env.VERCEL) {
    const vercelIp = request.headers.get("x-vercel-forwarded-for");
    if (vercelIp) {
      // Vercel only provides trusted IP or array of IPs where first is client
      return vercelIp.split(",")[0].trim();
    }
  }

  if (process.env.NETLIFY) {
    const netlifyIp = request.headers.get("x-nf-client-connection-ip");
    if (netlifyIp) {
      return netlifyIp.split(",")[0].trim();
    }
  }

  // 5. Default fallback
  return "127.0.0.1";
}
