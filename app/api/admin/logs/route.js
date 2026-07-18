import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth.mjs";
import { getRecentLogs } from "@/lib/logger.mjs";

export async function GET() {
  const auth = await requireRole("admin");
  if (auth instanceof Response) {
    return auth;
  }

  const logs = await getRecentLogs(50);
  return NextResponse.json({ logs });
}
