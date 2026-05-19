import { NextRequest, NextResponse } from "next/server";
import { hostname as osHostname, networkInterfaces } from "node:os";

export const runtime = "nodejs";

function isPrivateIpv4(ip: string): boolean {
  return (
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

function getPrivateIpv4Addresses(): string[] {
  const nets = networkInterfaces();
  const addresses: string[] = [];

  for (const netList of Object.values(nets)) {
    if (!netList) continue;

    for (const net of netList) {
      if (net.family !== "IPv4" || net.internal) continue;

      const ip = net.address;
      if (isPrivateIpv4(ip)) {
        addresses.push(ip);
      }
    }
  }

  return [...new Set(addresses)];
}

export async function GET(req: NextRequest) {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host") || "localhost:3000";
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const protocol = forwardedProto || "http";

  const [hostname, rawPort] = host.split(":");
  const port = rawPort ? `:${rawPort}` : "";

  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  if (!isLocalhost) {
    return NextResponse.json({ origin: `${protocol}://${host}`, origins: [`${protocol}://${host}`] });
  }

  const localOrigins = new Set<string>();
  const privateIps = getPrivateIpv4Addresses();

  for (const ip of privateIps) {
    localOrigins.add(`${protocol}://${ip}${port}`);
  }

  // mDNS hostname often works on iOS/Android on the same Wi-Fi.
  const localHostName = osHostname();
  if (localHostName) {
    const mdnsHost = localHostName.toLowerCase().endsWith(".local")
      ? localHostName
      : `${localHostName}.local`;
    localOrigins.add(`${protocol}://${mdnsHost}${port}`);
  }

  const origins = [...localOrigins];
  if (origins.length === 0) {
    origins.push(`${protocol}://${host}`);
  }

  return NextResponse.json({
    origin: origins[0],
    origins,
  });
}
