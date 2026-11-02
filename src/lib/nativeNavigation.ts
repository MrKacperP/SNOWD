/** Deliberate parents keep cold launches and Android Back out of OAuth history. */
export function nativeBackDestination(path: string): string | null {
  if (path === "/mobile" || path === "/dashboard") return null;
  if (path.startsWith("/dashboard/jobs/")) return "/dashboard/jobs";
  if (path.startsWith("/dashboard/messages/")) return "/dashboard/messages";
  if (path.startsWith("/dashboard/settings/")) return "/dashboard/settings";
  if (path.startsWith("/dashboard/")) return "/dashboard";
  if (path.startsWith("/policies/")) return "/mobile/settings";
  return "/mobile";
}

export function nativeCallback(url: string): "payment" | "connect" | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "snowd:" || parsed.username || parsed.password || parsed.port || !["", "/"].includes(parsed.pathname)) return null;
    if (parsed.hostname === "payment-return") return "payment";
    if (parsed.hostname === "connect-return") return "connect";
    return null;
  } catch { return null; }
}
