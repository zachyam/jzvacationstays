/**
 * Get the correct inspection URL based on the current environment
 */
export function getInspectionUrl(token: string): string {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Always use the main domain for inspection links, even when on admin subdomain
  const baseUrl = isLocalhost
    ? window.location.origin
    : 'https://jzvacationstays.com';

  return `${baseUrl}/inspect/${token}`;
}