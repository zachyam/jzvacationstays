export function getSubdomain(hostname: string): string | null {
  // Handle localhost development - check port for admin
  if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
    // For local dev: use localhost:3001 for admin, localhost:3000 for main
    const port = hostname.split(":")[1];
    if (port === "3001") return "admin";
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
    // Return the first part as subdomain
    return parts[0];
  }

  return null;
}

export function isAdminSubdomain(hostname: string): boolean {
  const subdomain = getSubdomain(hostname);
  // Check if subdomain is 'admin'
  return subdomain === "admin";
}

export function getRedirectUrl(
  currentHost: string,
  targetSubdomain: "www" | "admin",
  path: string = "/"
): string {
  // For localhost development
  if (currentHost.includes("localhost") || currentHost.includes("127.0.0.1")) {
    const port = targetSubdomain === "admin" ? "3001" : "3000";
    return `http://localhost:${port}${path}`;
  }

  // For production
  const domain = currentHost
    .split(".")
    .slice(-2)
    .join("."); // Gets "domain.com" from any subdomain

  const subdomain = targetSubdomain === "www" ? "www" : "admin";

  // For admin subdomain, strip /admin prefix from path if present
  if (targetSubdomain === "admin" && path.startsWith("/admin")) {
    path = path.substring(6) || "/"; // Remove "/admin" prefix
  }

  return `https://${subdomain}.${domain}${path}`;
}