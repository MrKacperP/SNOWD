import { NextResponse } from "next/server";
export function GET() { return NextResponse.json({ app: "snowd", nativeContract: 1, version: "1.0.0" }, { headers: { "Cache-Control": "no-store" } }); }
