export function getSubdomain(hostname: string): string | null {
  // Handle localhost development - check port for admin
  if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
    // For local dev: use localhost:3001 for admin, localhost:3000 for main
    const port = hostname.split(":")[1];
    if (port === "3001") return "app";
    return null;
  }

  // Extract subdomain from hostname
  const parts = hostname.split(".");

  // If we have at least 3 parts (subdomain.domain.tld)
  if (parts.length >= 3) {
    // Handle www specially - it's not a subdomain for our purposes
    if (parts[0] === "www") {
      return null;
    }
    // Return the first part as subdomain (app, admin, etc.)
    return parts[0];
  }

  return null;
}

export function isAdminSubdomain(hostname: string): boolean {
  const subdomain = getSubdomain(hostname);
  // Check if subdomain is 'app' or 'admin'
  return subdomain === "app" || subdomain === "admin";
}

export function getRedirectUrl(
  currentHost: string,
  targetSubdomain: "www" | "app",
  path: string = "/"
): string {
  // For localhost development
  if (currentHost.includes("localhost") || currentHost.includes("127.0.0.1")) {
    const port = targetSubdomain === "app" ? "3001" : "3000";
    return `http://localhost:${port}${path}`;
  }

  // For production
  const domain = currentHost
    .split(".")
    .slice(-2)
    .join("."); // Gets "domain.com" from any subdomain

  const subdomain = targetSubdomain === "www" ? "www" : "app";
  return `https://${subdomain}.${domain}${path}`;
}