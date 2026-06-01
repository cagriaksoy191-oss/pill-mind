export function getClientIp(request: Request): string {
  // 1. Check for Next.js explicit `ip` property (e.g. Edge environments)
  if ("ip" in request && typeof request.ip === "string" && request.ip) {
    return request.ip;
  }

  // 2. Check for trusted platform-specific headers that cannot be spoofed
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    // Vercel only provides trusted IP or array of IPs where first is client
    return vercelIp.split(",")[0].trim();
  }

  const netlifyIp = request.headers.get("x-nf-client-connection-ip");
  if (netlifyIp) {
    return netlifyIp.split(",")[0].trim();
  }

  // 3. To securely handle x-forwarded-for in custom deployments
  // The first IP in the list is easily spoofable by the client.
  // The last IP in the list is appended by the nearest proxy (usually our trusted Load Balancer/CDN).
  // If we don't have platform-specific headers, taking the right-most IP is the standard safe approach
  // against IP spoofing.
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map(i => i.trim()).filter(i => i.length > 0);
    if (ips.length > 0) {
      // In a reverse proxy setup, the client can spoof the left side,
      // but the immediate proxy connecting to our server appends the real IP to the right.
      return ips[ips.length - 1];
    }
  }


  // 5. Default fallback
  return "127.0.0.1";
}
